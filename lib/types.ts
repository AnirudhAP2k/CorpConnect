import { OrgKybSchema } from "@/lib/validation"
import { ApiTier, OrganizationRole } from "@prisma/client";
import { z } from "zod"

// ====== TYPE DEFINATIONS ====
export type MeetingStatus =
  | "NONE"
  | "PENDING_SENT"
  | "PENDING_RECEIVED"
  | "ACCEPTED"
  | "DECLINED"
  | "CANCELLED";

export type MeetingEmailEvent = "REQUESTED" | "ACCEPTED" | "DECLINED" | "CANCELLED";

export type AutomationTriggerType =
  | "EVENT_REGISTRATION"
  | "EVENT_CANCELLED"
  | "FEEDBACK_RECEIVED"
  | "CONNECTION_ACCEPTED"
  | "MEETING_SCHEDULED"
  | "NEW_MEMBER_JOINED";

export type OrgKybValues = z.infer<typeof OrgKybSchema>;

// ====== TYPE DEFINATIONS - END ====
// ==========================================
// ==========================================
// ====== INTERFACE DEFINATIONS - START ====
export interface UrlQueryParams {
  params: string
  key: string
  value: string | null
}

export interface RemoveUrlQueryParams {
  params: string
  keysToRemove: string[]
}

export interface MatchedOrg {
  id: string;
  name: string;
  logo: string | null;
  industry: { label: string } | null;
  location: string | null;
  services: string[];
  technologies: string[];
  partnershipInterests: string[];
  score: number;
  matchReason: string;
  source: "ai" | "sql";
}

export interface OrgMini {
  id: string;
  name: string;
  logo: string | null;
  industry: { label: string } | null;
}

export interface MeetingRequest {
  id: string;
  senderOrg: OrgMini;
  receiverOrg: OrgMini;
  status: string;
  agenda: string | null;
  proposedTime: Date | null;
  createdAt: Date;
  initiatedBy: { id: string; name: string | null };
}

export interface OptionsTypes {
  title: string;
  id: string;
  createdAt: Date;
  updatedAt: Date;
  label: string;
}

export interface UploadResult {
  success: boolean;
  url: string | null;
  imageUrl: string | null;
  publicId: string | null;
  message?: string;
}

/**
 * The shape stored in the x-auth-session header and returned by getApiAuth().
 * Mirrors `session.user` from NextAuth.
 */
export interface ApiAuthUser {
  id: string;
  email?: string | null;
  role?: OrganizationRole | null;
  isAppAdmin?: boolean;
  hasCompletedOnboarding?: boolean;
  activeOrganizationId?: string | null;
  apiTier?: ApiTier;
}

// ====== AI SERVICE INTERFACES - START ============

export interface AIEventBrief {
  title: string;
  description: string;
  targetAudience: string | null;
  location: string | null;
  estimatedBudget: number | null;
  agenda: Array<{ time?: string; item: string }>;
  startDateTime: string | null;
  endDateTime: string | null;
  aiBrief: string;
}

export interface AIChatBrainstormBriefResponse {
  sessionId: string;
  brief: AIEventBrief;
}

// ─── Phase 14: Event Summary Types ───────────────────────────────────────────

export interface AIEventSummaryRequest {
  eventId: string;
  eventTitle: string;
  totalAttendees: number;
  attendanceRate: number;         // 0–1
  avgRating: number | null;  // 1–5
  sentimentScore: number | null;  // -1 to +1
  feedbackSamples: string[];
  topThemes: string[];
}

export interface AIEventSummaryResult {
  eventId: string;
  overallScore: number;        // 0–10
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  executiveSummary: string;
}

// ─── Response types ────────────────────────────────────────────────────────────

export interface AIRecommendedEvent {
  eventId: string;
  title: string;
  score: number;
  reason: string;
}

export interface AIRecommendedOrg {
  orgId: string;
  name: string;
  score: number;
  sharedEvents: number;
}

export interface AISearchResult {
  eventId: string;
  title: string;
  score: number;
  snippet: string;
}

export interface AIRecommendEventsResponse {
  userId: string;
  recommendations: AIRecommendedEvent[];
  source: "ai" | "fallback";
}

export interface AIRecommendOrgsResponse {
  orgId: string;
  recommendations: AIRecommendedOrg[];
}

export interface AISemanticSearchResponse {
  query: string;
  results: AISearchResult[];
  count: number;
}

// ─── Phase 2: Content Generation ──────────────────────────────────────────────

export interface AIGeneratedContent {
  description: string;
  suggestions: string[];
  sourceDocs: string[];
}

export interface AIMatchmakingReason {
  reason: string;
  sharedThemes: string[];
}

// ─── Phase 3: Conversational AI ───────────────────────────────────────────────

export interface AIChatRequest {
  sessionId: string;           // "new" | existing UUID
  userId: string;
  contextId: string;           // eventId or orgId
  contextType: "EVENT" | "ORGANIZATION";
  message: string;
}

export interface AIChatResponse {
  sessionId: string;
  reply: string;
  sourceDocs: string[];        // chunk titles used — for UI transparency badges
}

export interface AIChatHistoryMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export interface AISentimentRequest {
  feedbackId: string;
  feedbackText: string | null;
  rating: number;          // 1–5
}

export interface AISentimentResult {
  feedbackId: string;
  sentiment: "POSITIVE" | "NEUTRAL" | "NEGATIVE";
  sentimentScore: number;        // -1.0 to +1.0
  themes: string[];
  summary: string;
}
export interface AIEventTasklistRequest {
  pitchId: string;
  title: string;
  description: string;
  targetAudience?: string | null;
  location?: string | null;
  estimatedBudget?: number | null;
  startDateTime?: string | null;
  endDateTime?: string | null;
  aiBrief: string;
}

export interface AIEventTasklistItem {
  title: string;
  description: string | null;
  /** Days relative to event start. Negative = before event, 0 = event day, positive = after */
  dueDayOffset: number;
  /** 1 = High, 2 = Medium, 3 = Low */
  priority: number;
  assignedRole: string | null;
}

export interface AIEventTasklistResponse {
  pitchId: string;
  tasks: AIEventTasklistItem[];
}

// ─── Enterprise Interfaces ───────────────────────────────────────────────────────────

export interface EnterpriseCheckResult {
  ok: boolean;
  reason?: string;
}

export interface RequireEnterpriseOptions {
  redirectTo?: string;
}


// ====== INTERFACE DEFINATIONS - END ====
