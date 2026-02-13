# Job Queue System - Implementation Plan

Implementing database-based job queue for asynchronous member invitations and other background tasks.

---

## Proposed Changes

### Phase 1: Database Schema for Job Queue

#### [MODIFY] [schema.prisma](file:///d:/evently/prisma/schema.prisma)

**New Models:**

```prisma
model PendingInvite {
  id             String           @id @default(cuid())
  organizationId String
  email          String
  role           OrganizationRole
  invitedBy      String
  status         InviteStatus     @default(PENDING)
  attempts       Int              @default(0)
  maxAttempts    Int              @default(3)
  lastAttempt    DateTime?
  error          String?
  createdAt      DateTime         @default(now())
  updatedAt      DateTime         @updatedAt
  
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  inviter        User @relation(fields: [invitedBy], references: [id])
  
  @@index([status, createdAt])
}

enum InviteStatus {
  PENDING
  SENT
  FAILED
  EXPIRED
}

model JobQueue {
  id          String    @id @default(cuid())
  type        JobType
  payload     Json
  status      JobStatus @default(PENDING)
  attempts    Int       @default(0)
  maxAttempts Int       @default(3)
  scheduledAt DateTime  @default(now())
  processedAt DateTime?
  error       String?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  
  @@index([status, scheduledAt])
  @@index([type, status])
}

enum JobType {
  SEND_INVITE_EMAIL
  SEND_NOTIFICATION
  SEND_EVENT_REMINDER
  GENERATE_REPORT
  CLEANUP_DATA
}

enum JobStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
  CANCELLED
}
```

---

### Phase 2: Update Member Invitation API

#### [MODIFY] [api/organizations/[id]/members/route.ts](file:///d:/evently/app/api/organizations/[id]/members/route.ts)

**Changes:**
- Instead of adding member directly, create `PendingInvite` record
- Return success immediately
- Let scheduler process the invite asynchronously

**Flow:**
```
1. Validate email and permissions
2. Check if user exists
3. Create PendingInvite record
4. Return 200 OK to user
5. Scheduler picks up invite later
6. Send email
7. Add member to organization
8. Update invite status
```

---

### Phase 3: Email Templates

#### [NEW] [lib/email-templates/member-invite.ts](file:///d:/evently/lib/email-templates/member-invite.ts)

**Template Function:**
```typescript
export function getMemberInviteEmailTemplate(data: {
  organizationName: string;
  inviterName: string;
  role: string;
  inviteLink: string;
}): string
```

**Email Content:**
- Welcome message
- Organization name and inviter
- Role information
- Accept invite button/link
- Branding

---

### Phase 4: Job Processor

#### [NEW] [lib/jobs/job-processor.ts](file:///d:/evently/lib/jobs/job-processor.ts)

**Purpose:** Generic job processing system

**Functions:**
- `processPendingInvites()` - Process invite emails
- `processJobQueue()` - Process generic jobs
- `retryFailedJobs()` - Retry failed jobs
- `cleanupOldJobs()` - Remove completed/expired jobs

**Features:**
- Batch processing
- Retry logic with exponential backoff
- Error logging
- Status updates

---

### Phase 5: Scheduler Setup

#### [NEW] [lib/scheduler/cron-jobs.ts](file:///d:/evently/lib/scheduler/cron-jobs.ts)

**Jobs:**
- Process pending invites (every 2 minutes)
- Process job queue (every 1 minute)
- Cleanup old jobs (daily)
- Retry failed jobs (every 10 minutes)

**Using node-cron:**
```typescript
import cron from 'node-cron';

// Every 2 minutes
cron.schedule('*/2 * * * *', processPendingInvites);

// Every minute
cron.schedule('* * * * *', processJobQueue);

// Daily at 2 AM
cron.schedule('0 2 * * *', cleanupOldJobs);
```

---

### Phase 6: Invite Acceptance Flow

#### [NEW] [app/invite/[token]/page.tsx](file:///d:/evently/app/invite/[token]/page.tsx)

**Purpose:** Accept invite page

**Flow:**
1. User clicks link in email
2. Verify token/invite is valid
3. If user exists, add to organization
4. If user doesn't exist, redirect to register with pre-filled email
5. Update invite status to ACCEPTED

---

## File Structure

```
prisma/
├── schema.prisma                    # Add new models

app/api/
├── organizations/[id]/members/
│   └── route.ts                     # Update to create PendingInvite

lib/
├── jobs/
│   ├── job-processor.ts             # Job processing logic
│   └── invite-processor.ts          # Invite-specific logic
├── scheduler/
│   └── cron-jobs.ts                 # Cron job setup
├── email-templates/
│   ├── member-invite.ts             # Invite email template
│   └── base-template.ts             # Base email layout
└── mailer.ts                        # Existing (use as-is)

app/
└── invite/
    └── [token]/
        └── page.tsx                 # Accept invite page
```

---

## Implementation Steps

### Step 1: Update Prisma Schema
- Add `PendingInvite` model
- Add `JobQueue` model
- Add enums
- Run migration

### Step 2: Update Member Invitation API
- Modify POST endpoint
- Create `PendingInvite` instead of direct add
- Generate invite token
- Return success immediately

### Step 3: Create Email Templates
- Member invite template
- Base email layout
- Styling

### Step 4: Build Job Processor
- Invite processor
- Generic job processor
- Retry logic
- Error handling

### Step 5: Setup Scheduler
- Install node-cron
- Create cron jobs
- Initialize in app startup

### Step 6: Create Invite Acceptance
- Accept invite page
- Token verification
- Add member to org
- Update invite status

---

## Environment Variables Needed

```env
# Already exists
SMTP_SERVER_HOST=
SMTP_TRANSPORTER_SERVICE=
SMTP_SERVER_USERNAME=
SMTP_SERVER_PASSWORD=
SENDER_EMAIL=

# New
NEXT_PUBLIC_APP_URL=http://localhost:3000
INVITE_TOKEN_SECRET=your-secret-key
```

---

## Testing Plan

### 1. Invite Creation
- Create invite via API
- Verify `PendingInvite` record created
- Verify immediate response to user

### 2. Email Processing
- Wait for scheduler to run
- Verify email sent
- Check invite status updated to SENT

### 3. Invite Acceptance
- Click link in email
- Verify user added to organization
- Check invite status updated to ACCEPTED

### 4. Error Handling
- Test with invalid email service
- Verify retry logic works
- Check error messages logged

### 5. Edge Cases
- Expired invites
- Already accepted invites
- User already in another org
- Max retry attempts reached

---

## Next Steps After Implementation

Once job queue is working:

1. **Event Reminders** - Send reminders before events
2. **Notifications** - User activity notifications
3. **Reports** - Generate analytics reports
4. **Data Cleanup** - Remove old/expired data
5. **AI Processing** - Background recommendation generation

Ready to proceed with implementation!
