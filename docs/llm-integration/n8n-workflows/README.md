# n8n Sample Workflows — Ops Runbook

This directory contains importable n8n workflow JSON files and instructions for setting up agentic automations with CorpConnect.

## Quick start

### Prerequisites

- n8n is running (via `compose.yaml` on port `5678`)
- `N8N_SHARED_SECRET` is set in both CorpConnect's `.env` and n8n's environment
- `N8N_CALLBACK_SECRET` is set in CorpConnect's `.env` (for optional outcome callbacks)

### Import a sample workflow

1. Open n8n at `http://localhost:5678`
2. Log in (default: `admin` / `changeme`, set via `N8N_ADMIN_USER` / `N8N_ADMIN_PASSWORD`)
3. Click **Workflows → Import from File**
4. Select `registration-ops-agent.json`
5. **Configure credentials** — the workflow stubs reference Slack / Email credentials you need to add
6. Click **Activate** (toggle top-right)
7. Copy the **Production webhook URL** from the Webhook node

### Wire it in CorpConnect (catalog path)

1. After activating the workflow in n8n, copy the **Production webhook URL**.
2. As app admin, open `/admin/automations` and set that URL on the `registration-ops-agent` template
   (templates are created by `pnpm db:seed`).
3. As org admin: org dashboard → **Automation Rules** → **Add Rule**
4. Trigger: "New Event Registration"
5. Workflow template: **Registration Ops Agent**
6. (Optional) Override the **Agent instruction**
7. Save → Test

### Legacy / BYO path

Use **Advanced: custom webhook URL** in Add Rule if the org brings its own n8n/Zapier endpoint.

---

## CorpConnect webhook payload shape

Every POST to your n8n webhook URL includes:

```json
{
  "ruleId": "uuid",
  "trigger": "EVENT_REGISTRATION",
  "orgId": "uuid",
  "contextData": {
    "eventId": "uuid",
    "userId": "uuid",
    "participationId": "uuid"
  },
  "promptTemplate": "If dietary restrictions are present, email the caterer...",
  "timestamp": 1234567890
}
```

### Headers

| Header | Value |
|---|---|
| `Content-Type` | `application/json` |
| `X-CorpConnect-Signature` | `sha256=<HMAC-SHA256 hex>` |
| `X-CorpConnect-Timestamp` | Unix epoch seconds |

### HMAC verification

The signature is computed over: `ruleId:trigger:orgId:timestamp` using `N8N_SHARED_SECRET` as the key.

#### n8n Code node verification snippet

```javascript
const crypto = require('crypto');

const secret = $env.N8N_SHARED_SECRET || 'your-secret';
const body = $input.first().json;
const signature = $input.first().headers['x-CorpConnect-signature'];
const timestamp = $input.first().headers['x-CorpConnect-timestamp'];

// Reject stale requests (optional: 5-minute replay window)
const age = Math.floor(Date.now() / 1000) - Number(timestamp);
if (age > 300) throw new Error('Replay: timestamp too old');

const message = `${body.ruleId}:${body.trigger}:${body.orgId}:${timestamp}`;
const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(message).digest('hex');

if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) {
  throw new Error('Invalid HMAC signature');
}

return $input.all();
```

---

## Callback to CorpConnect (optional)

After the workflow completes, you can POST the outcome back to CorpConnect:

```
POST /api/webhooks/n8n-callback
X-Callback-Secret: <N8N_CALLBACK_SECRET>
Content-Type: application/json

{
  "ruleId": "uuid",
  "status": "success" | "error",
  "executionId": "optional-n8n-execution-id"
}
```

---

## Available workflows

| File | Trigger | Description |
|---|---|---|
| `registration-ops-agent.json` | `EVENT_REGISTRATION` | Webhook → HMAC verify → AI Agent/IF branch → Slack/Email stubs |

---

## Using CorpConnect's hosted LLM (optional)

If you want your n8n workflow to use CorpConnect's LLM instead of configuring OpenAI credentials directly in n8n, add an HTTP Request node to call:

```
POST http://ai-service:8000/webhooks/n8n
X-N8n-Signature: <HMAC-SHA256 hex of body>
Content-Type: application/json

{
  "task": "freeform",
  "prompt": "Given this registration data, draft a welcome email...",
  "context": { ... }
}
```

Response: `{ "ok": true, "output": "..." }`

The HMAC is computed over the raw JSON body using `N8N_SHARED_SECRET` as the key.
