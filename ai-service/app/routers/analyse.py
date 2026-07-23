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

from app.prompts import load_prompt

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

    # ── Load prompt template & build messages ───────────────────────────────
    prompt_tpl = load_prompt("sentiment_analysis")
    text_part = body.feedbackText.strip() if body.feedbackText else "(no text provided)"
    user_content = prompt_tpl.format_user(rating=body.rating, feedback_text=text_part)

    messages = [
        {"role": "system", "content": prompt_tpl.system_prompt or ""},
        *(prompt_tpl.few_shot_examples or []),
        {"role": "user", "content": user_content},
    ]

    # ── Call LLM ─────────────────────────────────────────────────────────────
    try:
        client = get_llm_client()
        completion = await client.chat.completions.create(
            model=settings.LLM_MODEL_NAME,
            messages=messages,
            max_tokens=prompt_tpl.max_tokens or 200,
            temperature=prompt_tpl.temperature or 0.1,
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


# ─── Event Summary Endpoint ───────────────────────────────────────────────────

class EventSummaryRequest(BaseModel):
    eventId:          str
    eventTitle:       str
    totalAttendees:   int
    attendanceRate:   float = Field(..., ge=0.0, le=1.0)
    avgRating:        float | None = Field(None, ge=1.0, le=5.0)
    sentimentScore:   float | None = Field(None, ge=-1.0, le=1.0)
    feedbackSamples:  list[str] = Field(default_factory=list, max_length=30)
    topThemes:        list[str] = Field(default_factory=list)


class EventSummaryResponse(BaseModel):
    eventId:           str
    overallScore:      float
    strengths:         list[str]
    weaknesses:        list[str]
    recommendations:   list[str]
    executiveSummary:  str


def _heuristic_summary(req: EventSummaryRequest) -> EventSummaryResponse:
    """Rule-based fallback when LLM is unavailable."""
    rate_pct = round(req.attendanceRate * 100)
    rating_str = f"{req.avgRating:.1f}/5.0" if req.avgRating else "not collected"
    score = round((req.attendanceRate * 5) + ((req.avgRating or 3.0) - 1), 1)
    score = max(0.0, min(10.0, score))

    return EventSummaryResponse(
        eventId=req.eventId,
        overallScore=score,
        strengths=[
            f"Attendance rate of {rate_pct}% recorded",
            f"Average rating: {rating_str}",
        ],
        weaknesses=["Insufficient feedback data for detailed analysis"],
        recommendations=[
            "Encourage more attendees to submit post-event feedback",
            "Consider follow-up surveys within 48 hours of the event",
        ],
        executiveSummary=(
            f"{req.eventTitle} recorded an attendance rate of {rate_pct}% "
            f"with an average rating of {rating_str}. "
            "A full AI-powered analysis requires more feedback submissions."
        ),
    )


@router.post(
    "/event-summary",
    response_model=EventSummaryResponse,
    summary="Generate AI executive summary for a completed event",
)
async def generate_event_summary(body: EventSummaryRequest):
    """
    Synthesises aggregated event feedback and metrics into a structured
    executive summary report with Strengths, Weaknesses, Recommendations,
    and an overall quality score.

    Falls back to a heuristic summary if the LLM is not configured or
    if JSON parsing fails — the endpoint always returns a usable result.
    """
    fallback = _heuristic_summary(body)

    if not is_llm_configured():
        logger.warning("📋 EventSummary: LLM not configured, using heuristic fallback.")
        return fallback

    # Load template and build user message
    prompt_tpl = load_prompt("event_summary")
    rate_pct     = round(body.attendanceRate * 100)
    rating_str   = f"{body.avgRating:.1f}/5.0" if body.avgRating else "not available"
    sent_str     = f"{body.sentimentScore:+.2f}" if body.sentimentScore is not None else "not available"
    themes_str   = ", ".join(body.topThemes) if body.topThemes else "none detected"
    samples_text = "\n".join(f"- {s[:250]}" for s in body.feedbackSamples[:15]) or "No feedback text collected."

    user_message = prompt_tpl.format_user(
        event_title=body.eventTitle,
        total_attendees=body.totalAttendees,
        rate_pct=rate_pct,
        rating_str=rating_str,
        sent_str=sent_str,
        themes_str=themes_str,
        sample_count=len(body.feedbackSamples),
        samples_text=samples_text,
    )

    try:
        client = get_llm_client()
        completion = await client.chat.completions.create(
            model=settings.LLM_MODEL_NAME,
            messages=[
                {"role": "system", "content": prompt_tpl.system_prompt or ""},
                {"role": "user",   "content": user_message},
            ],
            max_tokens=prompt_tpl.max_tokens or 1000,
            temperature=prompt_tpl.temperature or 0.3,
        )
        raw = completion.choices[0].message.content or ""
        clean = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw.strip(), flags=re.DOTALL)
        parsed = _parse_llm_json(clean)

        if not parsed:
            logger.warning("📋 EventSummary: JSON parse failed — using fallback. Raw: %s", raw[:300])
            return fallback

        result = EventSummaryResponse(
            eventId=body.eventId,
            overallScore=round(float(parsed.get("overallScore", fallback.overallScore)), 1),
            strengths=[str(s) for s in parsed.get("strengths", [])[:5]],
            weaknesses=[str(w) for w in parsed.get("weaknesses", [])[:5]],
            recommendations=[str(r) for r in parsed.get("recommendations", [])[:5]],
            executiveSummary=str(parsed.get("executiveSummary", fallback.executiveSummary))[:3000],
        )
        logger.info(
            "📋 EventSummary generated: eventId=%s score=%.1f strengths=%d weaknesses=%d",
            body.eventId[:8], result.overallScore, len(result.strengths), len(result.weaknesses),
        )
        return result

    except Exception as exc:
        logger.error("📋 EventSummary: LLM call failed (%s) — using fallback.", exc)
        return fallback
