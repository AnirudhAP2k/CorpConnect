/**
 * lib/ai-service.ts
 *
 * Typed HTTP client for the Evently AI microservice.
 * Uses a master JWT for auth — bypasses tenant tier gates.
 *
 * All methods fail gracefully — if the AI service is unreachable,
 * they return empty arrays / undefined rather than throwing.
 * This ensures Next.js never surfaces AI service downtime to end users.
 */

import axios, { AxiosRequestConfig } from "axios";
import { SignJWT } from "jose";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL ?? "http://localhost:8000";
const AI_SERVICE_MASTER_KEY = process.env.AI_SERVICE_MASTER_KEY ?? "";

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

/** Generate a short-lived master JWT for internal service-to-service calls. */
export async function getMasterJwt(): Promise<string> {
    const secret = new TextEncoder().encode(AI_SERVICE_MASTER_KEY);
    return new SignJWT({ role: "master" })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("5m")
        .sign(secret);
}

export async function authHeaders(): Promise<Record<string, string>> {
    const token = await getMasterJwt();
    return {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
    };
}

// ─── Request helper ────────────────────────────────────────────────────────────

async function request<T>(
    path: string,
    options: AxiosRequestConfig = {}
): Promise<T | null> {
    if (!AI_SERVICE_MASTER_KEY) {
        // AI service not configured — silently skip
        return null;
    }
    try {
        const headers = await authHeaders();
        const res = await axios.get(`${AI_SERVICE_URL}${path}`, {
            headers,
            ...options,
            // Abort after 5s — never block user-facing response
            timeout: 5000,
        });
        if (res.status !== 200) return null;
        return res.data as Promise<T>;
    } catch {
        // Network error, timeout, or AI service down — fail silently
        return null;
    }
}

// ─── Public API ────────────────────────────────────────────────────────────────

export const aiService = {
    /** Get AI-ranked event recommendations for a user. Returns empty array if unavailable. */
    async recommendEvents(
        userId: string,
        limit = 10
    ): Promise<AIRecommendedEvent[]> {
        const response = await axios.get<AIRecommendEventsResponse>(
            `${AI_SERVICE_URL}/recommend/events/${userId}?limit=${limit}`,
            {
                headers: await authHeaders(),
            }
        );
        return response.data.recommendations ?? [];
    },

    /** Get org connection recommendations. Returns empty array if unavailable. */
    async recommendOrgs(
        orgId: string,
        limit = 10
    ): Promise<AIRecommendedOrg[]> {
        const response = await axios.get<AIRecommendOrgsResponse>(
            `${AI_SERVICE_URL}/recommend/orgs/${orgId}?limit=${limit}`,
            {
                headers: await authHeaders(),
            }
        );
        return response.data.recommendations ?? [];
    },

    /** Semantic search over events. Returns empty array if unavailable. */
    async semanticSearch(
        query: string,
        limit = 10
    ): Promise<AISearchResult[]> {
        const response = await axios.post<AISemanticSearchResponse>(
            `${AI_SERVICE_URL}/search/semantic`,
            {
                query,
                limit
            },
            {
                headers: await authHeaders(),
            }
        );
        return response.data.results ?? [];
    },

    /** Trigger embedding generation for an event (called from job runner). */
    async embedEvent(eventId: string, text: string): Promise<void> {
        await axios.post(`${AI_SERVICE_URL}/embed/event`, {
            eventId,
            text
        },
            {
                headers: await authHeaders(),
            });
    },

    /** Trigger embedding generation for an org (called from job runner). */
    async embedOrg(orgId: string, text: string): Promise<void> {
        await axios.post(`${AI_SERVICE_URL}/embed/org`, {
            orgId,
            text
        },
            {
                headers: await authHeaders(),
            });
    },

    /** Returns true if the AI service is reachable. */
    async isAvailable(): Promise<boolean> {
        if (!AI_SERVICE_MASTER_KEY) return false;
        try {
            const res = await axios.get(`${AI_SERVICE_URL}/health`, {
                timeout: 2000,
            });
            return res.status === 200;
        } catch {
            return false;
        }
    },

    // ─── Phase 2: Content Generation ──────────────────────────────────────────

    /**
     * Generate a polished event description from a rough draft, grounded in
     * the org's documents and platform compliance docs via RAG.
     */
    async generateEventDescription(
        orgId: string,
        roughDraft: string,
        eventId?: string,
    ): Promise<AIGeneratedContent | null> {
        try {
            const res = await axios.post<AIGeneratedContent>(
                `${AI_SERVICE_URL}/generate/event-description`,
                { orgId, roughDraft, eventId },
                { headers: await authHeaders(), timeout: 30000 },
            );
            return res.data;
        } catch {
            return null;
        }
    },

    /**
     * Generate a human-readable matchmaking explanation grounded in both
     * organizations' company descriptions retrieved via RAG.
     */
    async generateMatchmakingReason(
        sourceOrgId: string,
        targetOrgId: string,
        score: number,
    ): Promise<AIMatchmakingReason | null> {
        try {
            const res = await axios.post<AIMatchmakingReason>(
                `${AI_SERVICE_URL}/generate/matchmaking-reason`,
                { sourceOrgId, targetOrgId, score },
                { headers: await authHeaders(), timeout: 20000 },
            );
            return res.data;
        } catch {
            return null;
        }
    },

    // ─── Phase 3: Conversational AI ───────────────────────────────────────────

    /**
     * Send a message to the RAG-powered chat backend.
     * Pass sessionId = "new" to start a fresh conversation.
     */
    async chat(payload: AIChatRequest): Promise<AIChatResponse | null> {
        try {
            const res = await axios.post<AIChatResponse>(
                `${AI_SERVICE_URL}/chat/message`,
                payload,
                { headers: await authHeaders(), timeout: 30000 },
            );
            return res.data;
        } catch {
            return null;
        }
    },

    /**
     * Load all messages in a session (for ChatWidget initial load / resume).
     */
    async getChatHistory(sessionId: string): Promise<AIChatHistoryMessage[]> {
        try {
            const res = await axios.get<AIChatHistoryMessage[]>(
                `${AI_SERVICE_URL}/chat/history/${sessionId}`,
                { headers: await authHeaders(), timeout: 10000 },
            );
            return res.data;
        } catch {
            return [];
        }
    },

    /**
     * Analyse the sentiment of event feedback via the LLM.
     * The endpoint always returns a result (falls back to rating-based heuristic
     * if the LLM is unavailable). Returns null only on network failure.
     */
    async analyseSentiment(req: AISentimentRequest): Promise<AISentimentResult | null> {
        try {
            const res = await axios.post<AISentimentResult>(
                `${AI_SERVICE_URL}/analyse/sentiment`,
                req,
                { headers: await authHeaders(), timeout: 15000 },
            );
            return res.data;
        } catch {
            return null;
        }
    },
};
