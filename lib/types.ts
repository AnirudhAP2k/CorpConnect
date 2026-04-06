
// ====== USER PARAMS
export type CreateUserParams = {
  clerkId: string
  firstName: string
  lastName: string
  username: string
  email: string
  photo: string
}

export type UpdateUserParams = {
  firstName: string
  lastName: string
  username: string
  photo: string
}

// ====== EVENT PARAMS
export type CreateEventParams = {
  userId: string
  event: {
    title: string
    description: string
    location: string
    imageUrl: string
    startDateTime: Date
    endDateTime: Date
    categoryId: string
    price: string
    isFree: boolean
    url: string
  }
  path: string
}

export type UpdateEventParams = {
  userId: string
  event: {
    _id: string
    title: string
    imageUrl: string
    description: string
    location: string
    startDateTime: Date
    endDateTime: Date
    categoryId: string
    price: string
    isFree: boolean
    url: string
  }
  path: string
}

export type DeleteEventParams = {
  eventId: string
  path: string
}

export type GetAllEventsParams = {
  query: string
  category: string
  limit: number
  page: number
}

export type GetEventsByUserParams = {
  userId: string
  limit?: number
  page: number
}

export type GetRelatedEventsByCategoryParams = {
  categoryId: string
  eventId: string
  limit?: number
  page: number | string
}

export type Event = {
  id: string
  title: string
  description: string
  price: string
  isFree: boolean
  image: string
  location: string
  startDateTime: Date
  endDateTime: Date
  url: string
  organizer: {
    id: string
    name: string
  }
  category: {
    id: string
    label: string
  }
}

// ====== ORDER PARAMS
export type CheckoutOrderParams = {
  eventTitle: string
  eventId: string
  price: string
  isFree: boolean
  buyerId: string
}

export type CreateOrderParams = {
  stripeId: string
  eventId: string
  buyerId: string
  totalAmount: string
  createdAt: Date
}

export type GetOrdersByEventParams = {
  eventId: string
  searchString: string
}

export type GetOrdersByUserParams = {
  userId: string | null
  limit?: number
  page: string | number | null
}

// ====== URL QUERY PARAMS
export type UrlQueryParams = {
  params: string
  key: string
  value: string | null
}

export type RemoveUrlQueryParams = {
  params: string
  keysToRemove: string[]
}

export type SearchParamProps = {
  params: { id: string }
  searchParams: { [key: string]: string | string[] | undefined }
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

// ====== MEETING REQUEST TYPES

export type MeetingStatus =
  | "NONE"
  | "PENDING_SENT"
  | "PENDING_RECEIVED"
  | "ACCEPTED"
  | "DECLINED"
  | "CANCELLED";

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

export type MeetingEmailEvent = "REQUESTED" | "ACCEPTED" | "DECLINED" | "CANCELLED";

export interface OptionsTypes {
  title: string;
  id: string;
  createdAt: Date;
  updatedAt: Date;
  label: string;
}

export type AutomationTriggerType =
  | "EVENT_REGISTRATION"
  | "EVENT_CANCELLED"
  | "FEEDBACK_RECEIVED"
  | "CONNECTION_ACCEPTED"
  | "MEETING_SCHEDULED"
  | "NEW_MEMBER_JOINED";
