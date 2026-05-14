# Organization Verification & Access Management Architecture

## 1. User Groups and Access Management (IAM vs RBAC)

### Current Implementation
The application currently uses a solid **Role-Based Access Control (RBAC)** model defined in Prisma via the `OrganizationRole` enum (`OWNER`, `ADMIN`, `MEMBER`).

### Architectural Decision: Is IAM Overkill?
**Verdict:** Yes, implementing a full-fledged Custom IAM (Identity and Access Management with granular policy-based permissions) is overkill for the current platform features.

For most B2B SaaS and event management platforms, the `OWNER/ADMIN/MEMBER` hierarchy is perfectly sufficient to start with:
*   **OWNER**: Full access, capability to delete the organization, manage billing, change base configuration.
*   **ADMIN**: Capability to create/manage events, invite other members, manage organization profile.
*   **MEMBER**: Capability to view internal data, participate in events on behalf of the organization, and view general analytics.

**Future Considerations:** You should only consider building custom User Groups or a policy-based IAM when an **Enterprise customer explicitly requests it** (e.g., "We need an 'Event Marketer' role that can create events but cannot invite users"). Until then, keep the codebase simple by relying on the current RBAC implementation.

---

## 2. Organization Legitimacy Verification via AI

### The Challenge
Currently, organization registration collects basic data (`name`, `website`, `linkedinUrl`, `size`, `industryId`) and sets an `isVerified` boolean. However, there is no strong mechanism to manually verify legitimacy without human intervention.

### Enhanced Registration Data Collection
To effectively verify a company, we should start collecting or validating key structural data during the onboarding flow:
1.  **Corporate Email Validation**: Ensuring the registering user's email (e.g., `user@acmecorp.com`) matches the company's official domain (`acmecorp.com`).
2.  **Required Social Presence**: LinkedIn URL, Twitter URL, or equivalent.
3.  *(Optional)* **Registration Number**: Tax ID/EIN or Company Registration Number.

### AI-Powered Verification Architecture (n8n + LLM)

Since the application already includes n8n and background job processing (`JobQueue` with `TRIGGER_N8N_WORKFLOW`), we can leverage an AI agent to handle automated verification.

#### Step 1: The Trigger
*   Upon successful organization registration, a new background job is fired: `VERIFY_ORG_LEGITIMACY` (A new type to add to the `JobType` enum).
*   The job queue processor picks this up and triggers an external webhook to the corresponding **n8n workflow**, passing the organization's details (`name`, `website`, `linkedinUrl`, `creator email`).

#### Step 2: The n8n AI Workflow
The n8n workflow orchestrates several automated steps to gather intelligence:
1.  **Domain Matching**: It cross-checks the creator's email domain against the provided organization website. Discrepancies (like a `@gmail.com` user registering for a major domain) throw immediate flags.
2.  **Website Crawling**: An HTTP node scrapes the homepage of the provided `website`.
3.  **Social/Context Lookup**: The workflow pulls basic profile data from the provided LinkedIn/Twitter URLs.
4.  **LLM Evaluation**: The scraped content from the site and social metrics are fed straight into an LLM (e.g., OpenAI or Anthropic block in n8n) using a system prompt like:
    > *"You are a compliance AI. Analyze the following scraped website data and social metrics for the company '{Company Name}'. Does this appear to be a legitimate, active organization? Rate the legitimacy on a score of 1-100 and provide a one-paragraph summary of your findings."*

#### Step 3: Resolution & Result Sync
*   The n8n workflow finishes by triggering a webhook back into the Evently application (e.g., `POST /api/webhooks/org-verification`).
*   **Automated Action**: If the AI returns a "Trust Score" `> 85`, the platform automatically sets `isVerified = true` in the `Organization` record.
*   **Manual Fallback**: If the score is `< 85`, the organization remains unverified (`isVerified = false`). A notification (with the LLM's summary report) is triggered to internal App Admins for manual review.

### Summary
By integrating the existing n8n + LLM foundation, Evently can implement a near-instantaneous verification process for newly generated organizations without introducing complex IAM structures prematurely. This ensures platform integrity while maintaining a streamlined codebase.
