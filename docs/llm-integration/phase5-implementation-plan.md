# Phase 5 Implementation Plan — Agentic Workflows with n8n

> **Goal:** Give organization owners a no-code automation layer. When key platform events
> happen (e.g. new registration, feedback submitted, connection accepted), a configurable
> **AutomationRule** can fire an n8n workflow that performs arbitrary follow-up actions
> (send a Slack message, update a CRM, trigger an email drip sequence, etc.)
> — all without any code changes.

---

## Architecture Overview

```
Platform Event (DB write)
    │
    │  e.g. new EventParticipation, new OrgConnection, etc.
    ▼
Next.js Server Action / API Route
    │  1. Look up matching AutomationRules for this org + trigger
    │  2. Enqueue TRIGGER_N8N_WORKFLOW jobs for each matching rule
    ▼
lib/jobs/job-processor.ts  (next cron tick, ~1 min)
    │  processN8nWorkflow(payload)
    ▼
lib/jobs/n8n-trigger.ts
    │  HMAC-sign payload → POST to n8n webhook URL
    ▼
n8n  (self-hosted, Docker, port 5678)
    │  Executes workflow nodes (Slack / Email / HTTP / etc.)
    ▼
Optional: n8n POSTs result back to
app/api/webhooks/n8n-callback/route.ts
    │  Updates AutomationRule.lastRunAt + logs result
```

---

## Trigger Event Taxonomy

The following `AutomationTrigger` values will be supported at launch:

| Trigger | When it fires |
|---|---|
| `EVENT_REGISTRATION` | An attendee registers for an org's event |
| `EVENT_CANCELLED` | An event the org hosts is cancelled |
| `FEEDBACK_RECEIVED` | A new `EventFeedback` row is created for an org's event |
| `CONNECTION_ACCEPTED` | An `OrgConnection` is accepted (either side) |
| `MEETING_SCHEDULED` | A `MeetingRequest` is accepted |
| `NEW_MEMBER_JOINED` | A new `OrganizationMember` row is created for this org |

New triggers can be added cheaply — just add an enum value and a call to `enqueueMatchingRules()`.

---

## Step 1 — Infrastructure: Docker Compose (`compose.yaml`)

Add the `n8n` service:

```yaml
n8n:
  image: n8nio/n8n:latest
  restart: always
  ports:
    - "5678:5678"
  environment:
    - N8N_BASIC_AUTH_ACTIVE=true
    - N8N_BASIC_AUTH_USER=${N8N_ADMIN_USER}
    - N8N_BASIC_AUTH_PASSWORD=${N8N_ADMIN_PASSWORD}
    - N8N_HOST=${N8N_HOST:-localhost}
    - N8N_PORT=5678
    - N8N_PROTOCOL=http
    - WEBHOOK_URL=${N8N_WEBHOOK_BASE_URL}
    - EXECUTIONS_DATA_SAVE_ON_ERROR=all
    - EXECUTIONS_DATA_SAVE_ON_SUCCESS=all
    - DB_TYPE=postgresdb           # reuse existing DB
    - DB_POSTGRESDB_HOST=db
    - DB_POSTGRESDB_PORT=5432
    - DB_POSTGRESDB_DATABASE=${POSTGRES_DB}
    - DB_POSTGRESDB_USER=${POSTGRES_USER}
    - DB_POSTGRESDB_PASSWORD=${POSTGRES_PASSWORD}
    - DB_POSTGRESDB_SCHEMA=n8n    # isolated schema
  volumes:
    - n8n_data:/home/node/.n8n
  depends_on:
    db:
      condition: service_healthy
```

### New env vars (`.env.example`)

```env
N8N_ADMIN_USER=admin
N8N_ADMIN_PASSWORD=changeme
N8N_HOST=localhost
N8N_WEBHOOK_BASE_URL=http://localhost:5678
N8N_SHARED_SECRET=<random 32-byte hex>      # HMAC signing key
N8N_CALLBACK_SECRET=<random 32-byte hex>    # for n8n → Next.js callback
```

> **Security model:** Every outbound request to n8n is HMAC-SHA256 signed with
> `N8N_SHARED_SECRET`. n8n workflows are configured to validate this header before
> executing. The callback auth uses a separate `N8N_CALLBACK_SECRET`.

---

## Step 2 — Database Schema (`prisma/schema.prisma`)

### New Enum

```prisma
enum AutomationTrigger {
  EVENT_REGISTRATION
  EVENT_CANCELLED
  FEEDBACK_RECEIVED
  CONNECTION_ACCEPTED
  MEETING_SCHEDULED
  NEW_MEMBER_JOINED
}

enum AutomationStatus {
  ACTIVE
  PAUSED
  DELETED
}
```

### New Model

```prisma
model AutomationRule {
  id             String             @id @default(uuid()) @db.Uuid
  organizationId String             @db.Uuid
  name           String             // Human-readable label, e.g. "Notify Slack on registration"
  description    String?
  trigger        AutomationTrigger
  webhookUrl     String             // Points to a specific n8n webhook path
  filterJson     Json?              // Optional fine-grained filter (e.g. only for eventId X)
  status         AutomationStatus   @default(ACTIVE)
  runCount       Int                @default(0)
  lastRunAt      DateTime?
  lastRunStatus  String?            // "success" | "error" | "timeout"
  createdAt      DateTime           @default(now())
  updatedAt      DateTime           @updatedAt
  organization   Organization       @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@index([organizationId, trigger, status])
}
```

Also add to `Organization`:
```prisma
automationRules  AutomationRule[]
```

`TRIGGER_N8N_WORKFLOW` is **already** in the `JobType` enum — no change needed.

**Apply:** `npx prisma db push`

---

## Step 3 — n8n Trigger Job Handler (`lib/jobs/n8n-trigger.ts`)

```typescript
// Called by job processor for TRIGGER_N8N_WORKFLOW jobs
export async function processN8nWorkflow(payload: N8nJobPayload): Promise<void> {
  1. Fetch AutomationRule by ruleId to get webhookUrl
  2. Build HMAC-SHA256 signature: sign(ruleId + eventType + orgId + timestamp, N8N_SHARED_SECRET)
  3. POST to rule.webhookUrl with:
       body:    { ruleId, trigger, orgId, contextData, timestamp }
       headers: { X-Evently-Signature: "sha256=<hex>", X-Evently-Timestamp: "<epoch>" }
  4. On success: UPDATE AutomationRule SET runCount++, lastRunAt, lastRunStatus="success"
  5. On failure (4xx/5xx/timeout): UPDATE lastRunStatus="error", re-throw for retry
}

export interface N8nJobPayload {
  ruleId:      string;
  trigger:     AutomationTrigger;
  orgId:       string;
  contextData: Record<string, unknown>;  // event-specific data (eventId, userId, etc.)
}
```

---

## Step 4 — Helper: `enqueueMatchingRules()` (`lib/jobs/automation.ts`)

A utility used by all trigger points to avoid repeating the lookup logic:

```typescript
export async function enqueueMatchingRules(
  trigger: AutomationTrigger,
  orgId:   string,
  contextData: Record<string, unknown>,
): Promise<void> {
  // 1. Find all ACTIVE rules for this org + trigger
  const rules = await prisma.automationRule.findMany({
    where: { organizationId: orgId, trigger, status: "ACTIVE" },
    select: { id: true },
  });

  // 2. Enqueue one TRIGGER_N8N_WORKFLOW job per matching rule
  if (rules.length === 0) return;
  await prisma.jobQueue.createMany({
    data: rules.map(r => ({
      type:    "TRIGGER_N8N_WORKFLOW",
      payload: { ruleId: r.id, trigger, orgId, contextData },
    })),
  });
}
```

---

## Step 5 — Wire Triggers into Platform Events

### Trigger points to instrument

| File | When to call `enqueueMatchingRules()` |
|---|---|
| Event participation server action | After `EventParticipation` create → `EVENT_REGISTRATION` |
| Event cancel/update action | After status set to cancelled → `EVENT_CANCELLED` |
| `lib/actions/feedback.ts` | After `submitFeedback` upsert → `FEEDBACK_RECEIVED` |
| OrgConnection accept action | After status → ACCEPTED → `CONNECTION_ACCEPTED` |
| MeetingRequest accept action | After status → ACCEPTED → `MEETING_SCHEDULED` |
| Member invite accept action | After `OrganizationMember` create → `NEW_MEMBER_JOINED` |

Each call is fire-and-forget (non-blocking) — the cron job handles actual delivery.

---

## Step 6 — n8n Callback Webhook (`app/api/webhooks/n8n-callback/route.ts`)

Allows n8n to report the outcome of an execution back to the platform (optional).

```
POST /api/webhooks/n8n-callback
Headers:
  X-Callback-Secret: <N8N_CALLBACK_SECRET>
Body:
  { ruleId, status: "success" | "error", executionId, outputData? }

Processing:
  1. Validate X-Callback-Secret header
  2. Update AutomationRule.lastRunStatus, lastRunAt
  3. Return 200 OK
```

---

## Step 7 — Server Actions (`lib/actions/automation.ts`)

CRUD for organizers to manage their rules via the UI:

```typescript
createAutomationRule(orgId, { name, trigger, webhookUrl, description?, filterJson? })
  → Auth: org OWNER/ADMIN only
  → Returns: AutomationRule

listAutomationRules(orgId)
  → Returns: AutomationRule[] ordered by createdAt desc

toggleAutomationRule(ruleId)
  → Flips status between ACTIVE and PAUSED

deleteAutomationRule(ruleId)
  → Sets status = DELETED (soft delete, preserves runCount history)

testAutomationRule(ruleId)
  → Enqueues a synthetic TRIGGER_N8N_WORKFLOW job with dummy contextData
  → Returns: { jobId }
```

---

## Step 8 — Frontend: `AutomationRulesPanel` (`components/automation/AutomationRulesPanel.tsx`)

Embedded on the Org Dashboard below SentimentPanel.

```
┌──────────────────────────────────────────────────────────┐
│ ⚡ Automation Rules                    [+ Add Rule]       │
├──────────────────────────────────────────────────────────┤
│  🟢 Notify Slack on Registration      EVENT_REGISTRATION  │
│     Webhook: https://n8n.myco.com/...  Runs: 47   [▶/⏸][🗑]│
├──────────────────────────────────────────────────────────┤
│  🟡 CRM Update on Connection          CONNECTION_ACCEPTED │
│     Webhook: https://n8n.myco.com/...  Runs: 12   [▶/⏸][🗑]│
├──────────────────────────────────────────────────────────┤
│  ⏸ Welcome DM on Member Join          NEW_MEMBER_JOINED  │
│     Webhook: https://n8n.myco.com/...  Runs: 3    [▶/⏸][🗑]│
└──────────────────────────────────────────────────────────┘
```

### Sub-component: `AddRuleSheet`
- **Trigger selector**: dropdown of `AutomationTrigger` enum values (with human-readable labels)
- **Webhook URL input**: with URL validation and a `[Test]` button
- **Name + Description**: free text
- **Advanced (optional)**: JSON filter field for power users

---

## Implementation Order

```
Step 1  → compose.yaml: add n8n service
Step 2  → .env: add N8N_SHARED_SECRET, N8N_CALLBACK_SECRET, ...
Step 3  → prisma/schema.prisma: AutomationRule model + enums
Step 4  → npx prisma db push
Step 5  → lib/jobs/n8n-trigger.ts (job handler)
Step 6  → lib/jobs/job-processor.ts (add TRIGGER_N8N_WORKFLOW case)
Step 7  → lib/jobs/automation.ts (enqueueMatchingRules helper)
Step 8  → lib/actions/automation.ts (CRUD server actions)
Step 9  → app/api/webhooks/n8n-callback/route.ts (result callback)
Step 10 → Wire enqueueMatchingRules() into 6 trigger points
Step 11 → components/automation/AutomationRulesPanel.tsx
Step 12 → components/automation/AddRuleSheet.tsx
Step 13 → Embed AutomationRulesPanel on Org Dashboard
```

Steps 1–2 are infra-only (can be done ahead of time).
Steps 3–4 must come before 5–9.
Steps 11–13 can be built in parallel with 5–10.

---

## Security Considerations

| Concern | Mitigation |
|---|---|
| Unauthorized n8n triggers | HMAC-SHA256 signature on every outbound POST; replay window = 5 minutes (timestamp check) |
| Leaked webhook URLs | Stored encrypted in DB (or just hashed prefix display in UI) |
| SSRF via webhookUrl | URL allow-list validation: only `https://` URLs; optionally restrict to known n8n domain |
| n8n callback spoofing | Separate `N8N_CALLBACK_SECRET` header check |
| Wildfire job storms | `createMany` with dedup: one job per rule per trigger event |

---

## File Checklist

| # | File | Status |
|---|---|---|
| 1 | `compose.yaml` | ⬜ |
| 2 | `.env` / `.env.example` | ⬜ |
| 3 | `prisma/schema.prisma` | ⬜ |
| 4 | `lib/jobs/n8n-trigger.ts` | ⬜ |
| 5 | `lib/jobs/job-processor.ts` | ⬜ |
| 6 | `lib/jobs/automation.ts` | ⬜ |
| 7 | `lib/actions/automation.ts` | ⬜ |
| 8 | `app/api/webhooks/n8n-callback/route.ts` | ⬜ |
| 9 | Trigger instrumentation (6 files) | ⬜ |
| 10 | `components/automation/AutomationRulesPanel.tsx` | ⬜ |
| 11 | `components/automation/AddRuleSheet.tsx` | ⬜ |
| 12 | Org Dashboard page | ⬜ |
