# Job Queue System - Implementation Walkthrough

## ✅ Completed Implementation

Successfully implemented a database-based job queue system for asynchronous member invitations and future background tasks.

---

## 🎯 What Was Built

### 1. Database Schema Updates

**Files Modified:**
- [schema.prisma](file:///d:/evently/prisma/schema.prisma)

**New Models:**

#### PendingInvite
Tracks member invitations with email delivery status:
- `token` - Unique invite link token
- `status` - PENDING, SENT, ACCEPTED, FAILED, EXPIRED
- `attempts` - Retry counter (max 3)
- `expiresAt` - 7 days from creation
- `error` - Last error message if failed

#### JobQueue
Generic job queue for future tasks:
- `type` - Job type enum (SEND_INVITE_EMAIL, SEND_NOTIFICATION, etc.)
- `payload` - JSON data for the job
- `status` - PENDING, PROCESSING, COMPLETED, FAILED, CANCELLED
- `scheduledAt` - When to process the job

**New Enums:**
- `InviteStatus` - Invitation states
- `JobType` - Types of background jobs
- `JobStatus` - Job processing states

---

### 2. Email Template

**File:** [lib/email-templates/member-invite.ts](file:///d:/evently/lib/email-templates/member-invite.ts)

**Features:**
- Professional HTML design
- Evently branding
- Organization name and inviter
- Role badge
- Accept invitation button
- Expiration notice (7 days)
- Responsive layout

**Function:**
```typescript
sendMemberInviteEmail({
  organizationName: string,
  inviterName: string,
  role: string,
  inviteLink: string,
  recipientEmail: string
})
```

---

### 3. Job Processor

**File:** [lib/jobs/job-processor.ts](file:///d:/evently/lib/jobs/job-processor.ts)

**Functions:**

#### `processPendingInvites()`
- Fetches PENDING invites (max 10 at a time)
- Sends invitation emails
- Updates status to SENT or FAILED
- Implements retry logic (max 3 attempts)
- Marks expired invites

#### `processJobQueue()`
- Processes generic background jobs
- Supports multiple job types
- Retry logic with exponential backoff
- Error logging

#### `cleanupOldJobs()`
- Deletes completed jobs older than 7 days
- Deletes expired/accepted invites older than 30 days

**Features:**
- Batch processing
- Automatic retry on failure
- Error tracking
- Status updates
- Expiration handling

---

### 4. Scheduler Setup

**File:** [lib/scheduler/cron-jobs.ts](file:///d:/evently/lib/scheduler/cron-jobs.ts)

**Cron Jobs:**
```
*/2 * * * *  - Process pending invites (every 2 minutes)
* * * * *    - Process job queue (every minute)
0 2 * * *    - Cleanup old jobs (daily at 2 AM)
```

**Manual Triggers:**
- `triggerInviteProcessing()` - Test invite processing
- `triggerJobProcessing()` - Test job queue
- `triggerCleanup()` - Test cleanup

---

### 5. Updated Member Invitation API

**File:** [api/organizations/[id]/members/route.ts](file:///d:/evently/app/api/organizations/[id]/members/route.ts)

**Changes:**
- Creates `PendingInvite` instead of directly adding member
- Generates unique token (32-byte hex)
- Sets 7-day expiration
- Returns immediately (doesn't wait for email)
- Checks for duplicate pending invites

**Flow:**
```
1. Validate permissions (OWNER/ADMIN)
2. Check user exists
3. Check not already member
4. Check one-org-per-user rule
5. Generate unique token
6. Create PendingInvite record
7. Return 200 OK
8. Scheduler sends email later
```

---

### 6. Invite Acceptance Page

**File:** [app/invite/[token]/page.tsx](file:///d:/evently/app/invite/[token]/page.tsx)

**Validations:**
- ✅ Invite exists
- ✅ Not expired
- ✅ Not already accepted
- ✅ User logged in
- ✅ Email matches invite
- ✅ User not in another org

**Success Flow:**
1. Add user to organization
2. Update user's organizationId
3. Mark invite as ACCEPTED
4. Redirect to organization page

**Error States:**
- Invalid invitation
- Expired invitation
- Already accepted
- Email mismatch
- Already in another org

---

### 7. Scheduler Initialization

**File:** [instrumentation.ts](file:///d:/evently/instrumentation.ts)

Initializes cron jobs when Next.js app starts.

**File:** [next.config.ts](file:///d:/evently/next.config.ts)

Enabled experimental instrumentation hook.

---

### 8. Manual Job Trigger API

**File:** [api/jobs/trigger/route.ts](file:///d:/evently/app/api/jobs/trigger/route.ts)

**Endpoint:** `POST /api/jobs/trigger`

**Usage:**
```bash
# Trigger invite processing
curl -X POST http://localhost:3000/api/jobs/trigger \
  -H "Content-Type: application/json" \
  -d '{"type": "invites"}'

# Trigger all jobs
curl -X POST http://localhost:3000/api/jobs/trigger \
  -H "Content-Type: application/json" \
  -d '{"type": "all"}'
```

**Types:**
- `invites` - Process pending invites
- `jobs` - Process job queue
- `cleanup` - Run cleanup
- `all` - Process invites and jobs

---

## 🗄️ Database Migration

### Manual Migration Required

Due to database permissions, run the SQL migration manually:

**File:** [migrations/manual_add_job_queue_and_pending_invites.sql](file:///d:/evently/prisma/migrations/manual_add_job_queue_and_pending_invites.sql)

**Steps:**
1. Connect to your PostgreSQL database
2. Run the SQL file
3. Run `npx prisma generate` to update Prisma client

**Or use Prisma:**
```bash
npx prisma db push
npx prisma generate
```

---

## 🧪 Testing Instructions

### 1. Setup

```bash
# Install dependencies
npm install node-cron @types/node-cron

# Run migration
npx prisma db push
npx prisma generate

# Start dev server
npm run dev
```

---

### 2. Test Member Invitation

**Step 1: Send Invitation**
```bash
# Via UI: Go to /organizations/[id]/members
# Click "Add Member"
# Enter email and role
# Click "Add Member"
```

**Expected:**
- ✅ Immediate success message
- ✅ `PendingInvite` record created in database
- ✅ Status: PENDING

**Step 2: Wait for Scheduler (2 minutes max)**

Check logs:
```
[Scheduler] Running: Process Pending Invites
[Job Processor] Found 1 pending invites
[Job Processor] ✓ Sent invite to user@example.com
```

**Expected:**
- ✅ Email sent
- ✅ Status updated to SENT
- ✅ Email received in inbox

---

### 3. Test Invite Acceptance

**Step 1: Click Link in Email**

Navigate to: `http://localhost:3000/invite/[token]`

**Expected:**
- ✅ Redirect to login if not logged in
- ✅ Show welcome page if logged in with correct email

**Step 2: Accept Invitation**

**Expected:**
- ✅ User added to organization
- ✅ Invite status: ACCEPTED
- ✅ Redirect to organization page

---

### 4. Test Manual Trigger

```bash
# Trigger immediately (for testing)
curl -X POST http://localhost:3000/api/jobs/trigger \
  -H "Content-Type: application/json" \
  -d '{"type": "invites"}'
```

**Expected:**
```json
{
  "message": "Invite processing triggered successfully"
}
```

---

### 5. Test Error Handling

**Test 1: Invalid Email Service**

Temporarily break SMTP config, send invite.

**Expected:**
- ✅ Invite created
- ✅ Email fails
- ✅ Status: PENDING
- ✅ Error message logged
- ✅ Retry on next scheduler run

**Test 2: Expired Invite**

Create invite, wait 7+ days (or manually update expiresAt).

**Expected:**
- ✅ Invite marked as EXPIRED
- ✅ Cannot accept
- ✅ Shows "Invitation Expired" message

**Test 3: Duplicate Invite**

Try inviting same email twice.

**Expected:**
- ✅ Error: "An invitation has already been sent to this email"

---

## 📊 Database Queries

### Check Pending Invites

```sql
SELECT * FROM "PendingInvite" 
WHERE status = 'PENDING' 
ORDER BY "createdAt" DESC;
```

### Check Failed Invites

```sql
SELECT email, error, attempts 
FROM "PendingInvite" 
WHERE status = 'FAILED';
```

### Check Job Queue

```sql
SELECT * FROM "JobQueue" 
WHERE status IN ('PENDING', 'PROCESSING') 
ORDER BY "scheduledAt" ASC;
```

---

## 🔧 Environment Variables

Add to `.env`:

```env
# Email (already exists)
SMTP_SERVER_HOST=smtp.gmail.com
SMTP_TRANSPORTER_SERVICE=gmail
SMTP_SERVER_USERNAME=your-email@gmail.com
SMTP_SERVER_PASSWORD=your-app-password
SENDER_EMAIL=noreply@evently.com

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Job trigger secret (optional, for production)
JOB_TRIGGER_SECRET=your-secret-key
```

---

## 🚀 Future Job Types

The job queue system is ready for:

### 1. Event Reminders
```typescript
await prisma.jobQueue.create({
  data: {
    type: "SEND_EVENT_REMINDER",
    payload: {
      eventId: "...",
      userId: "...",
    },
    scheduledAt: eventDate.minus({ hours: 24 }),
  },
});
```

### 2. Notifications
```typescript
await prisma.jobQueue.create({
  data: {
    type: "SEND_NOTIFICATION",
    payload: {
      userId: "...",
      message: "...",
      type: "EVENT_UPDATE",
    },
  },
});
```

### 3. Report Generation
```typescript
await prisma.jobQueue.create({
  data: {
    type: "GENERATE_REPORT",
    payload: {
      organizationId: "...",
      reportType: "ANALYTICS",
      period: "MONTHLY",
    },
  },
});
```

### 4. Data Cleanup
```typescript
await prisma.jobQueue.create({
  data: {
    type: "CLEANUP_DATA",
    payload: {
      target: "OLD_SESSIONS",
      olderThan: 30, // days
    },
  },
});
```

---

## 📈 Monitoring

### Check Scheduler Status

```bash
# Check logs for scheduler activity
[Scheduler] Initializing cron jobs...
[Scheduler] ✓ All cron jobs initialized successfully
[Scheduler] Running: Process Pending Invites
[Job Processor] Found X pending invites
```

### Check Processing Stats

```sql
-- Invite stats
SELECT status, COUNT(*) 
FROM "PendingInvite" 
GROUP BY status;

-- Job stats
SELECT type, status, COUNT(*) 
FROM "JobQueue" 
GROUP BY type, status;
```

---

## ✅ Summary

**Implemented:**
- ✅ Database-based job queue
- ✅ Asynchronous email sending
- ✅ Retry logic with max attempts
- ✅ Cron scheduler (node-cron)
- ✅ Professional email templates
- ✅ Invite acceptance flow
- ✅ Error handling and logging
- ✅ Manual job triggers
- ✅ Generic job queue for future use

**Benefits:**
- Fast API responses (no waiting for email)
- Reliable email delivery with retries
- Audit trail of all invitations
- Scalable for future background tasks
- Easy to monitor and debug

Ready for production! 🎉
