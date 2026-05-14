"""
routers/analyse.py — POST /analyse/sentiment

LLM-powered sentiment analysis for event feedback.

Given a feedback text and star rating, returns:
  - sentiment      : POSITIVE | NEUTRAL | NEGATIVE
  - sentimentScore : float -1.0 to +1.0
  - themes         : list of detected topic tags (e.g. "Networking", "Venue")
  - summary        : one-sentence distillation of the feedback

Fallback: if the LLM is unavailable or JSON parsing fails, sentiment is derived
purely from the star rating (4-5 → POSITIVE, 3 → NEUTRAL, 1-2 → NEGATIVE).

Auth: require_master_jwt (internal Next.js job-processor calls only).
"""

import json
import logging
import re

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.llm import is_llm_configured, get_llm_client
from app.config import settings
from app.middleware.auth import require_master_jwt

logger = logging.getLogger(__name__)
router = APIRouter(dependencies=[Depends(require_master_jwt)])


# ─── Pydantic Models ──────────────────────────────────────────────────────────

class SentimentRequest(BaseModel):
    feedbackId:   str
    feedbackText: str | None = None
    rating:       int = Field(..., ge=1, le=5)


class SentimentResponse(BaseModel):
    feedbackId:     str
    sentiment:      str          # "POSITIVE" | "NEUTRAL" | "NEGATIVE"
    sentimentScore: float        # -1.0 → +1.0
    themes:         list[str]
    summary:        str


# ─── Helpers ─────────────────────────────────────────────────────────────────

_SYSTEM_PROMPT = """\
You are an event-feedback analyst. Given a star rating (1-5) and optional text,
return ONLY a valid JSON object with these fields — no markdown, no extra text:

{
  "sentiment":      "POSITIVE" | "NEUTRAL" | "NEGATIVE",
  "sentimentScore": <float -1.0 to 1.0>,
  "themes":         [<up to 4 topic tags from this list:
                      "Content Quality", "Networking", "Venue",
                      "Speakers", "Organisation", "Value for Money",
                      "Online Experience", "Catering", "Schedule", "Overall">],
  "summary":        "<one concise sentence summarising the feedback>"
}

Rules:
- 4-5 stars with positive text → POSITIVE, score ≥ 0.3
- 3 stars or mixed text        → NEUTRAL,  score near 0.0
- 1-2 stars or negative text   → NEGATIVE, score ≤ -0.3
- If feedbackText is empty, base everything on the rating alone.
- Return ONLY the JSON object, nothing else.
"""

_FEW_SHOT_EXAMPLES = [
    {
        "role": "user",
        "content": "Rating: 5\nText: Absolutely incredible event! The speakers were world-class and the networking session helped me land two new partnerships. Will definitely attend again."
    },
    {
        "role": "assistant",
        "content": '{"sentiment":"POSITIVE","sentimentScore":0.95,"themes":["Speakers","Networking","Overall"],"summary":"An outstanding event with world-class speakers and productive networking that led to valuable business partnerships."}'
    },
    {
        "role": "user",
        "content": "Rating: 3\nText: Some good talks but the venue was too cramped and the Wi-Fi kept dropping during the online sessions."
    },
    {
        "role": "assistant",
        "content": '{"sentiment":"NEUTRAL","sentimentScore":-0.1,"themes":["Content Quality","Venue","Online Experience"],"summary":"Mixed experience with decent content undermined by an overcrowded venue and poor internet connectivity."}'
    },
    {
        "role": "user",
        "content": "Rating: 1\nText: Terrible organisation. Half the scheduled speakers didn't show up and no one from the team was available to help."
    },
    {
        "role": "assistant",
        "content": '{"sentiment":"NEGATIVE","sentimentScore":-0.92,"themes":["Organisation","Speakers"],"summary":"Poorly organised event where scheduled speakers were absent and event staff were unavailable to assist attendees."}'
    },
]


def _rating_fallback(rating: int, text: str | None) -> SentimentResponse:
    """Derive sentiment purely from rating when LLM is unavailable."""
    if rating >= 4:
        sentiment, score = "POSITIVE", round((rating - 3) / 2, 2)
    elif rating == 3:
        sentiment, score = "NEUTRAL", 0.0
    else:
        sentiment, score = "NEGATIVE", round((rating - 3) / 2, 2)

    summary = text[:120] + "…" if text and len(text) > 120 else (text or f"{rating}-star rating.")
    return SentimentResponse(
        feedbackId="",
        sentiment=sentiment,
        sentimentScore=score,
        themes=[],
        summary=summary,
    )


def _parse_llm_json(raw: str) -> dict | None:
    """Extract and parse the JSON object from the LLM response."""
    # Strip any accidental markdown fences
    raw = re.sub(r"```(?:json)?", "", raw).strip()
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        # Try to find a JSON object substring
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        if match:
            try:
                return json.loads(match.group())
            except json.JSONDecodeError:
                pass
    return None


# ─── Route ────────────────────────────────────────────────────────────────────

@router.post(
    "/sentiment",
    response_model=SentimentResponse,
    summary="Analyse sentiment of event feedback text",
)
async def analyse_sentiment(body: SentimentRequest):
    """
    Run LLM-based sentiment analysis on event feedback.
    Falls back to a pure rating-based heuristic if the LLM is not configured
    or if the response cannot be parsed, ensuring the endpoint always returns
    a usable result.
    """
    # ── Always-available fallback ─────────────────────────────────────────────
    fallback = _rating_fallback(body.rating, body.feedbackText)
    fallback.feedbackId = body.feedbackId

    if not is_llm_configured():
        logger.warning("📊 Sentiment: LLM not configured, using rating fallback.")
        return fallback

    # ── Build user message ────────────────────────────────────────────────────
    text_part = body.feedbackText.strip() if body.feedbackText else "(no text provided)"
    user_content = f"Rating: {body.rating}\nText: {text_part}"

    messages = [
        {"role": "system", "content": _SYSTEM_PROMPT},
        *_FEW_SHOT_EXAMPLES,
        {"role": "user", "content": user_content},
    ]

    # ── Call LLM ─────────────────────────────────────────────────────────────
    try:
        client = get_llm_client()
        completion = await client.chat.completions.create(
            model=settings.LLM_MODEL_NAME,
            messages=messages,
            max_tokens=200,
            temperature=0.1,      # Low temp for consistent structured output
        )
        raw = completion.choices[0].message.content or ""
        parsed = _parse_llm_json(raw)

        if not parsed:
            logger.warning("📊 Sentiment: JSON parse failed — using fallback. Raw: %s", raw[:200])
            return fallback

        # Validate and clamp values
        valid_sentiments = {"POSITIVE", "NEUTRAL", "NEGATIVE"}
        sentiment = parsed.get("sentiment", "").upper()
        if sentiment not in valid_sentiments:
            sentiment = fallback.sentiment

        score = float(parsed.get("sentimentScore", fallback.sentimentScore))
        score = max(-1.0, min(1.0, score))

        themes = [str(t) for t in parsed.get("themes", []) if isinstance(t, str)][:4]
        summary = str(parsed.get("summary", fallback.summary))[:300]

        logger.info(
            "📊 Sentiment analysed: id=%s sentiment=%s score=%.2f themes=%s",
            body.feedbackId[:8], sentiment, score, themes,
        )

        return SentimentResponse(
            feedbackId=body.feedbackId,
            sentiment=sentiment,
            sentimentScore=score,
            themes=themes,
            summary=summary,
        )

    except Exception as exc:
        logger.error("📊 Sentiment: LLM call failed (%s) — using fallback.", exc)
        return fallback
