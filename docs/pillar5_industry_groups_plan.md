# Phase 8 Pillar 5: Industry Groups / Consortiums Implementation Plan

## Overview
This plan details the implementation of **Industry Groups / Consortiums** (Pillar 5). This feature allows organizations to form groups based on their industry, share an internal feed, maintain a shared event calendar, and manage membership.

## 1. Database Schema Updates (`prisma/schema.prisma`)

Add the following new models to manage groups, membership, feed posts, and group events:

```prisma
model IndustryGroup {
  id          String                @id @default(uuid()) @db.Uuid
  name        String
  description String?
  logo        String?               // Optional logo for the group
  industryId  String                @db.Uuid
  createdById String                @db.Uuid
  createdAt   DateTime              @default(now())
  updatedAt   DateTime              @updatedAt
  
  industry    Industry              @relation(fields: [industryId], references: [id], onDelete: Cascade)
  createdBy   User                  @relation(fields: [createdById], references: [id])
  members     IndustryGroupMember[]
  posts       GroupPost[]
  events      IndustryGroupEvent[]
  
  @@index([industryId])
}

model IndustryGroupMember {
  id             String           @id @default(uuid()) @db.Uuid
  groupId        String           @db.Uuid
  organizationId String           @db.Uuid
  role           OrganizationRole @default(MEMBER) // Uses existing OWNER/ADMIN/MEMBER
  joinedAt       DateTime         @default(now())
  
  group          IndustryGroup    @relation(fields: [groupId], references: [id], onDelete: Cascade)
  organization   Organization     @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@unique([groupId, organizationId])
  @@index([organizationId])
}

model GroupPost {
  id             String        @id @default(uuid()) @db.Uuid
  groupId        String        @db.Uuid
  authorOrgId    String        @db.Uuid
  authorUserId   String        @db.Uuid
  content        String
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt
  
  group          IndustryGroup @relation(fields: [groupId], references: [id], onDelete: Cascade)
  authorOrg      Organization  @relation(fields: [authorOrgId], references: [id], onDelete: Cascade)
  authorUser     User          @relation(fields: [authorUserId], references: [id])

  @@index([groupId])
}

model IndustryGroupEvent {
  id             String        @id @default(uuid()) @db.Uuid
  groupId        String        @db.Uuid
  eventId        String        @db.Uuid
  addedByOrgId   String        @db.Uuid
  createdAt      DateTime      @default(now())
  
  group          IndustryGroup @relation(fields: [groupId], references: [id], onDelete: Cascade)
  event          Events        @relation(fields: [eventId], references: [id], onDelete: Cascade)
  addedByOrg     Organization  @relation(fields: [addedByOrgId], references: [id], onDelete: Cascade)

  @@unique([groupId, eventId])
  @@index([groupId])
}
```

**Relation Updates:**
- `User`: `createdIndustryGroups`, `groupPosts`
- `Organization`: `industryGroupMembers`, `groupPosts`, `addedGroupEvents`
- `Industry`: `industryGroups`
- `Events`: `industryGroupEvents`

## 2. API Routes (`app/api/groups/...`)
- **GET `/api/groups`**: Fetch list of groups (discover & my groups).
- **POST `/api/groups`**: Create a new group.
- **GET `/api/groups/[id]`**: Fetch details for a group.
- **POST `/api/groups/[id]/members`**: Join group.
- **DELETE `/api/groups/[id]/members`**: Leave group.
- **GET/POST `/api/groups/[id]/posts`**: Fetch and create feed posts.
- **GET/POST `/api/groups/[id]/events`**: List and add events to the group's shared calendar.

## 3. Data Access Layer (`data/groups.ts`)
Create a new file with functions for securely interacting with group data:
- `getGroups(orgId, industryId)`
- `getGroupById(id, orgId)`
- `getGroupFeed(groupId, orgId)`
- `getGroupEvents(groupId, orgId)`

## 4. UI Components & Pages (`app/(protected)/groups/...`)

- **`/groups` (Groups Directory)**
  - Tabs for "My Groups" and "Discover".
  - Cards listing groups by name, industry, member count, and description.
  - "Create Group" modal.

- **`/groups/[id]` (Group Details Page)**
  - **Header**: Group Name, Industry, Member count, and Join/Leave button.
  - **Tabs**:
    - **Feed**: Post creation text area and list of posts (Organization name, User name, content, timestamp).
    - **Calendar**: Shared events list. Allows members to "Share an Event" to the group calendar.
    - **Members**: List of organizations that are part of the consortium.
    - **About**: Basic group details and description.

## 5. Security & Access Control
- A user must have an active organization to create or join a group.
- Only users with `OWNER` or `ADMIN` roles in their organization can join, leave, or manage the organization's membership in a group.
- Feed posts and calendar events can only be viewed or posted by organizations that are members of the group.

## Action Plan
1. [User Approval] Review this plan.
2. Update `schema.prisma` with the new models and relations, and run `db push`.
3. Build the Data Access Layer (`data/groups.ts`).
4. Build API Routes.
5. Create UI Pages and Components for browsing and viewing groups.
6. Test functionality.
