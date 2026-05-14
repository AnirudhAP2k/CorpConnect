# Phase 4 Implementation Plan — Sentiment Analysis & Feedback Loop

> **Goal:** Let attendees submit structured post-event feedback, automatically
> analyse its sentiment via the LLM, and surface actionable insights to
> organizers through charts on the Organization Dashboard.

---

## Architecture Overview

```
Attendee (FeedbackForm)
    │  submitFeedback() server action
    ▼
lib/actions/feedback.ts  (auth + participation check)
    │  1. Insert EventFeedback row (rating + text)
    │  2. Enqueue ANALYSE_FEEDBACK_SENTIMENT job → JobQueue
    ▼
lib/jobs/sentiment-analysis.ts  (job handler)
    │  POST /analyse/sentiment  (internal, Master JWT)
    ▼
ai-service/app/routers/analyse.py
    │  1. Run few-shot LLM call on feedbackText
    │  2. Return { sentiment, score, themes[], summary }
    ▼
EventFeedback.sentiment / .sentimentScore updated in DB
    ▼
SentimentPanel (Org Dashboard)
    │  getFeedbackSummary() server action
    └─ Aggregate stats + recent comments + theme breakdown → recharts
```

---

## Step 1 — Database Schema (`prisma/schema.prisma`)

### New Model

```prisma
model EventFeedback {
  id              String           @id @default(uuid()) @db.Uuid
  eventId         String           @db.Uuid
  userId          String           @db.Uuid
  rating          Int              // 1–5 star rating
  feedbackText    String?          // Optional free-text comment
  sentiment       FeedbackSentiment? // Filled after AI analysis
  sentimentScore  Float?           // -1.0 (very negative) to +1.0 (very positive)
  themes          String[]         @default([])   // e.g. ["Networking", "Content Quality"]
  aiSummary       String?          // 1-sentence LLM summary
  analysedAt      DateTime?
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt
  event           Events           @relation(fields: [eventId], references: [id], onDelete: Cascade)
  user            User             @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([eventId, userId])   // one feedback per attendee per event
  @@index([eventId])
  @@index([userId])
  @@index([sentiment])
}

enum FeedbackSentiment {
  POSITIVE
  NEUTRAL
  NEGATIVE
}
```

Also add to `Events`:
```prisma
feedbacks   EventFeedback[]
```

And to `User`:
```prisma
feedbacks   EventFeedback[]
```

**Apply:** `npx prisma db push`

---

## Step 2 — AI Service: `analyse.py` Router

**File:** `ai-service/app/routers/analyse.py`  
**Auth:** `require_master_jwt`

### Endpoint: `POST /analyse/sentiment`

```
Request:
  feedbackId:   UUID
  feedbackText: string
  rating:       int (1–5)

Response:
  sentiment:      "POSITIVE" | "NEUTRAL" | "NEGATIVE"
  sentimentScore: float (-1.0 to +1.0)
  themes:         list[str]   (e.g. ["Networking", "Venue", "Content Quality"])
  summary:        str          (1-sentence distillation)
```

### LLM approach
- **Few-shot prompt** — system message provides 3 examples of rating+text → {sentiment, score, themes, summary}
- **Structured output** — ask the LLM for JSON-only response (easy to parse)
- **Fallback heuristic** — if LLM is unavailable or parse fails, derive sentiment from rating alone: 4-5 → POSITIVE, 3 → NEUTRAL, 1-2 → NEGATIVE

---

## Step 3 — Next.js: Job Handler `lib/jobs/sentiment-analysis.ts`

```typescript
// Called by the job processor when type === "ANALYSE_FEEDBACK_SENTIMENT"
export async function processSentimentAnalysis(payload: { feedbackId: string }) {
  1. Fetch EventFeedback row (feedbackId, feedbackText, rating)
  2. Call aiService.analyseSentiment(...)
  3. Update EventFeedback with { sentiment, sentimentScore, themes, aiSummary, analysedAt }
}
```

Wire into `lib/jobs/job-processor.ts` switch statement.

---

## Step 4 — Next.js: `lib/actions/feedback.ts`

### `submitFeedback(eventId, rating, feedbackText?)`
```
1. auth() → userId
2. Verify user has EventParticipation for eventId (status: REGISTERED or ATTENDED)
3. prisma.eventFeedback.upsert(...)      // allow editing their own feedback
4. Enqueue ANALYSE_FEEDBACK_SENTIMENT job if feedbackText exists
5. Return { success, data }
```

### `getEventFeedbackSummary(eventId)`
```
Returns for the SentimentPanel:
  - averageRating     (AVG of rating)
  - totalResponses    (COUNT)
  - sentimentBreakdown  { positive, neutral, negative } counts
  - topThemes         (frequency-counted array of theme strings)
  - recentComments    (last 5 with sentiment label)
  - ratingDistribution  { 1: n, 2: n, 3: n, 4: n, 5: n }
```

### `getUserFeedback(eventId)` — for pre-filling the FeedbackForm

---

## Step 5 — Frontend: `FeedbackForm.tsx`

**File:** `components/feedback/FeedbackForm.tsx`

- **Trigger:** "Rate this event" button on the Event detail page (shown only if user has a participation record)
- **Fields:** Star rating (1–5, accessible), optional text area (max 500 chars)
- **UX:** Submit → optimistic "Thank you" state → background job handles sentiment

---

## Step 6 — Frontend: `SentimentPanel.tsx`

**File:** `components/feedback/SentimentPanel.tsx`

Embedded on the Org Dashboard below the existing content. Shows:

```
┌─────────────────────────────────────────────────────────┐
│ 📊 Event Feedback Intelligence            [Filter: All ▼]│
├──────────────────┬──────────────────┬───────────────────┤
│  ★ 4.2 avg       │  142 responses   │  78% Positive     │
├──────────────────┴──────────────────┴───────────────────┤
│  [Sentiment Donut Chart]   [Rating Bar Chart 1–5]        │
├─────────────────────────────────────────────────────────┤
│  Top Themes: [Networking ×34] [Content ×28] [Venue ×19] │
├─────────────────────────────────────────────────────────┤
│  Recent Comments:                                        │
│  ★★★★★ "Amazing speakers!"       😊 POSITIVE            │
│  ★★★☆☆ "Venue was too crowded"   😐 NEUTRAL             │
└─────────────────────────────────────────────────────────┘
```

Uses `recharts` (already available in the project via the Revenue widget).

---

## Step 7 — `lib/ai-service.ts` Extension

New type + method:

```typescript
export interface AISentimentResult {
  sentiment:      "POSITIVE" | "NEUTRAL" | "NEGATIVE";
  sentimentScore: number;
  themes:         string[];
  summary:        string;
}

// Method on aiService:
async analyseSentiment(feedbackId, feedbackText, rating): Promise<AISentimentResult | null>
```

---

## Implementation Order

```
Step 1  → schema.prisma + db push
Step 2  → ai-service/app/routers/analyse.py + main.py
Step 3  → lib/ai-service.ts (types + method)
Step 4  → lib/jobs/sentiment-analysis.ts
Step 5  → lib/jobs/job-processor.ts (add ANALYSE_FEEDBACK_SENTIMENT case)
Step 6  → lib/actions/feedback.ts
Step 7  → components/feedback/FeedbackForm.tsx
Step 8  → components/feedback/SentimentPanel.tsx
Step 9  → Embed FeedbackForm on Event page (for participants)
Step 10 → Embed SentimentPanel on Org Dashboard
```

Steps 2–3 can be parallel. Steps 4–6 depend on Step 2–3. Steps 7–8 depend on Step 6.

---

## File Checklist

| # | File | Status |
|---|---|---|
| 1 | `prisma/schema.prisma` | ⬜ |
| 2 | `ai-service/app/routers/analyse.py` | ⬜ |
| 3 | `ai-service/main.py` | ⬜ |
| 4 | `lib/ai-service.ts` | ⬜ |
| 5 | `lib/jobs/sentiment-analysis.ts` | ⬜ |
| 6 | `lib/jobs/job-processor.ts` | ⬜ |
| 7 | `lib/actions/feedback.ts` | ⬜ |
| 8 | `components/feedback/FeedbackForm.tsx` | ⬜ |
| 9 | `components/feedback/SentimentPanel.tsx` | ⬜ |
| 10 | Event detail page | ⬜ |
| 11 | Org dashboard page | ⬜ |
