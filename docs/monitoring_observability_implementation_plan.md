# Implementation Plan: Monitoring & Observability with Sentry

This document outlines the architecture, configuration, and implementation steps to integrate Sentry into both the Next.js web application and the Python/FastAPI AI service.

---

## 1. Objectives

- **Real-Time Error Tracking**: Capture client-side and server-side runtime errors instantly.
- **Performance Tracing**: Track API response times, database queries (via Prisma), and network calls to identify bottlenecks.
- **Cross-Service Traceability**: Link requests starting from the Next.js frontend down to the Python AI service.
- **Budget-Friendly Configuration**: Tune sample rates to stay within Sentry's free Developer tier limits (5k errors/mo, 10k transactions/mo).

---

## 2. Next.js Web App Integration

Next.js operates across three distinct runtimes: Browser (Client), Node.js (Server), and Edge (Vercel Edge functions / Middleware). We will configure Sentry for each runtime.

### 2.1 Dependencies
```bash
pnpm install @sentry/nextjs
```

### 2.2 Configuration Files
We will use the Next.js 15 standard instrumentation files:

- **`instrumentation-client.ts`** (Client-side tracking)
  - Tracks React component crashes, unhandled promise rejections, and browser console errors.
  - Exports `onRouterTransitionStart` hook to capture navigation transitions.
- **`instrumentation.ts`** (Server-side and Edge tracking)
  - Calls `Sentry.init` conditionally for both `nodejs` and `edge` runtimes.
  - Exports `onRequestError` hook to capture Server Component, Server Action, and API route exceptions.
- **`app/global-error.tsx`** (Root-level rendering error capture)
  - Intercepts root layout rendering errors and logs them to Sentry using `Sentry.captureException`.

### 2.3 `next.config.ts` Wrapper
We will wrap the existing configuration in `next.config.ts` with `withSentryConfig` to enable:
- Automatic source maps uploading during build (essential for de-obfuscating production stack traces).
- Dynamic telemetry rewrites.

---

## 3. Python/FastAPI AI Service Integration

Sentry provides native ASGI support for FastAPI.

### 3.1 Dependencies
Add the following package to `ai-service/requirements.txt`:
```text
sentry-sdk[fastapi]==2.7.1
```

### 3.2 Application Initialization (`ai-service/main.py`)
Import and initialize Sentry during application startup:
```python
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration

sentry_sdk.init(
    dsn=settings.SENTRY_DSN,
    integrations=[FastApiIntegration()],
    traces_sample_rate=0.1,  # Capture 10% of transactions for performance monitoring
    profiles_sample_rate=0.1,  # Profile 10% of agent requests
    environment=settings.ENVIRONMENT,
)
```

---

## 4. Environment Variables

We must add configuration parameters to `.env` and `.env.example` files:

### Next.js root `.env`
```env
# Sentry Configuration
SENTRY_DSN="https://your-public-dsn@sentry.io/project-id"
SENTRY_AUTH_TOKEN="your-sentry-cli-auth-token-only-for-builds"
```

### AI Service `.env`
```env
# Sentry Configuration
SENTRY_DSN="https://your-private-dsn@sentry.io/project-id"
ENVIRONMENT="development" # or "production"
```

---

## 5. Verification Tasks

To ensure Sentry is correctly initialized and reporting events:
1. **Trigger Client-Side Error**: Create a temporary button or run a snippet in the browser console throwing a runtime exception.
2. **Trigger Server-Side Error**: Access an API route designed to crash (e.g., throwing a `new Error()`).
3. **Trigger AI Service Error**: Call a debug health endpoint in FastAPI that raises an `Exception`.
4. **Inspect Sentry Dashboard**: Confirm that errors display full sourcemaps (correct line numbers in TS/Python) and breadcrumbs.
