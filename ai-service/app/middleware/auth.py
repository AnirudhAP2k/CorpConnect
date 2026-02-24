"""
middleware/auth.py — Multi-tenant authentication for the Evently AI Service.

Two auth modes:
  1. Master JWT (Authorization: Bearer <token>)
     Used by Next.js for internal embed jobs and server-side recommendation calls.
     Bypasses tier gating and usage limits.

  2. Tenant key (X-Tenant-ID + X-API-Key headers)
     Used by organisations calling the AI service directly.
     Keys hashed with bcrypt. Tier-gated. Usage tracked.

Tier capabilities:
  FREE       → /embed/* (internal only via master JWT)
  PRO        → /recommend/events, /recommend/orgs
  ENTERPRISE → all endpoints including /search/semantic
"""

import bcrypt
from enum import Enum
from fastapi import HTTPException, Request, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from app.config import settings
from app.database import get_api_credential, increment_usage

bearer_scheme = HTTPBearer(auto_error=False)


class ApiTier(str, Enum):
    FREE       = "FREE"
    PRO        = "PRO"
    ENTERPRISE = "ENTERPRISE"


# Maps endpoint path prefixes to minimum required tier
TIER_GATES: dict[str, ApiTier] = {
    "/embed":              ApiTier.FREE,        # internal master-JWT only in practice
    "/recommend/events":   ApiTier.PRO,
    "/recommend/orgs":     ApiTier.PRO,
    "/search/semantic":    ApiTier.ENTERPRISE,
}

TIER_ORDER = [ApiTier.FREE, ApiTier.PRO, ApiTier.ENTERPRISE]


def _tier_sufficient(user_tier: ApiTier, required_tier: ApiTier) -> bool:
    return TIER_ORDER.index(user_tier) >= TIER_ORDER.index(required_tier)


def _verify_master_jwt(token: str) -> bool:
    """Returns True if token is a valid master JWT."""
    try:
        jwt.decode(token, settings.MASTER_KEY, algorithms=["HS256"])
        return True
    except JWTError:
        return False


async def _validate_tenant_key(tenant_id: str, api_key: str) -> ApiTier:
    """
    Validate X-Tenant-ID + X-API-Key.
    Returns the tenant's tier on success, raises HTTPException on failure.
    """
    credential = await get_api_credential(tenant_id)

    if not credential:
        raise HTTPException(status_code=401, detail="Invalid tenant ID")

    # Verify against bcrypt hash
    key_matches = bcrypt.checkpw(api_key.encode(), credential["apiKey"].encode())
    if not key_matches:
        raise HTTPException(status_code=401, detail="Invalid API key")

    # Check usage limit
    if credential["usageCount"] >= credential["usageLimit"]:
        raise HTTPException(
            status_code=402,
            detail=f"Usage limit reached ({credential['usageLimit']} requests). Upgrade to continue.",
        )

    await increment_usage(tenant_id)
    return ApiTier(credential["tier"])


async def require_auth(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Security(bearer_scheme),
) -> ApiTier:
    """
    FastAPI dependency — validates auth and returns the effective API tier.
    Injects into route handlers via Depends(require_auth).
    """
    path = request.url.path

    # ── Mode 1: Master JWT ───────────────────────────────────────────────────
    if credentials and _verify_master_jwt(credentials.credentials):
        return ApiTier.ENTERPRISE  # master key gets full access

    # ── Mode 2: Tenant key ───────────────────────────────────────────────────
    tenant_id = request.headers.get("X-Tenant-ID")
    api_key   = request.headers.get("X-API-Key")

    if not tenant_id or not api_key:
        raise HTTPException(
            status_code=401,
            detail="Provide either a master JWT or X-Tenant-ID + X-API-Key headers.",
        )

    tier = await _validate_tenant_key(tenant_id, api_key)

    # ── Tier gate ────────────────────────────────────────────────────────────
    for prefix, required in TIER_GATES.items():
        if path.startswith(prefix):
            if not _tier_sufficient(tier, required):
                raise HTTPException(
                    status_code=403,
                    detail=f"This endpoint requires {required.value} tier. Your current tier: {tier.value}.",
                )
            break

    return tier
