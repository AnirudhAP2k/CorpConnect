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

// ─── Auth ──────────────────────────────────────────────────────────────────────

const AI_SERVICE_URL = process.env.AI_SERVICE_URL ?? "http://localhost:8000";
const AI_SERVICE_MASTER_KEY = process.env.AI_SERVICE_MASTER_KEY ?? "";

/** Generate a short-lived master JWT for internal service-to-service calls. */
async function getMasterJwt(): Promise<string> {
    const secret = new TextEncoder().encode(AI_SERVICE_MASTER_KEY);
    return new SignJWT({ role: "master" })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("5m")
        .sign(secret);
}

async function authHeaders(): Promise<Record<string, string>> {
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
        const response = await request<AIRecommendEventsResponse>(
            `/recommend/events/${userId}?limit=${limit}`
        );
        return response?.recommendations ?? [];
    },

    /** Get org connection recommendations. Returns empty array if unavailable. */
    async recommendOrgs(
        orgId: string,
        limit = 10
    ): Promise<AIRecommendedOrg[]> {
        const response = await request<AIRecommendOrgsResponse>(
            `/recommend/orgs/${orgId}?limit=${limit}`
        );
        return response?.recommendations ?? [];
    },

    /** Semantic search over events. Returns empty array if unavailable. */
    async semanticSearch(
        query: string,
        limit = 10
    ): Promise<AISearchResult[]> {
        const response = await request<AISemanticSearchResponse>(
            "/search/semantic",
            {
                method: "POST",
                data: JSON.stringify({ query, limit }),
            }
        );
        return response?.results ?? [];
    },

    /** Trigger embedding generation for an event (called from job runner). */
    async embedEvent(eventId: string, text: string): Promise<void> {
        await request("/embed/event", {
            method: "POST",
            data: JSON.stringify({ eventId, text }),
        });
    },

    /** Trigger embedding generation for an org (called from job runner). */
    async embedOrg(orgId: string, text: string): Promise<void> {
        await request("/embed/org", {
            method: "POST",
            data: JSON.stringify({ orgId, text }),
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
};
