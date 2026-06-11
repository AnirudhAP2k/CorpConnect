/**
 * Displays the AI-generated operational milestone checklist for an approved pitch.
 * Tasks are grouped by lifecycle phase (Pre-Event / Event Day / Post-Event).
 * Enterprise-gated — only visible to org members.
 */

import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { CheckCircle2, Circle, Clock, Users, AlertTriangle, Sparkles, ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

// ─── Metadata ─────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
    title: "Event Tasklist — CorpConnect",
    description: "Operational milestone checklist generated from your approved event pitch.",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getPriorityLabel(priority: number) {
    return priority === 1 ? "High" : priority === 2 ? "Medium" : "Low";
}

function getPriorityColor(priority: number) {
    return priority === 1 ? "#ef4444" : priority === 2 ? "#f59e0b" : "#22c55e";
}

/**
 * Group tasks by lifecycle phase based on dueDayOffset:
 *   Pre-Event:  offset < 0
 *   Event Day:  offset === 0
 *   Post-Event: offset > 0
 */
function groupTasksByPhase(tasks: TaskItem[]) {
    return {
        preEvent: tasks.filter((t) => t.dueDayOffset < 0).sort((a, b) => a.dueDayOffset - b.dueDayOffset),
        eventDay: tasks.filter((t) => t.dueDayOffset === 0),
        postEvent: tasks.filter((t) => t.dueDayOffset > 0).sort((a, b) => a.dueDayOffset - b.dueDayOffset),
    };
}

type TaskItem = {
    id: string;
    title: string;
    description: string | null;
    dueDayOffset: number;
    priority: number;
    assignedRole: string | null;
    isCompleted: boolean;
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function PitchTasksPage({
    params,
}: {
    params: Promise<{ id: string; pitchId: string }>;
}) {
    const session = await auth();
    if (!session?.user?.id) redirect("/login");

    const { id: organizationId, pitchId } = await params;

    // Verify caller is a member of this org
    const membership = await prisma.organizationMember.findFirst({
        where: { userId: session.user.id, organizationId },
        select: { role: true },
    });
    if (!membership) redirect(`/organizations/${organizationId}`);

    const pitch = await prisma.eventPitch.findUnique({
        where: { id: pitchId, organizationId },
        select: {
            id: true,
            title: true,
            status: true,
            tasks: {
                select: {
                    id: true,
                    title: true,
                    description: true,
                    dueDayOffset: true,
                    priority: true,
                    assignedRole: true,
                    isCompleted: true,
                },
                orderBy: { dueDayOffset: "asc" },
            },
        },
    });

    if (!pitch) notFound();

    if (pitch.status !== "APPROVED") {
        return (
            <div className="pitch-tasks-empty">
                <AlertTriangle className="w-12 h-12 text-amber-400 mb-4" />
                <h1 className="text-xl font-bold text-white mb-2">Tasklist Not Available</h1>
                <p className="text-slate-400 text-sm max-w-sm text-center">
                    The operational tasklist is only generated for approved pitches.
                    This pitch is currently in <strong className="text-white">{pitch.status}</strong> status.
                </p>
                <Link href={`/organizations/${organizationId}/pitches`} className="back-link">
                    ← Back to Pitches
                </Link>
            </div>
        );
    }

    if (pitch.tasks.length === 0) {
        return (
            <div className="pitch-tasks-empty">
                <Sparkles className="w-12 h-12 text-indigo-400 mb-4 animate-pulse" />
                <h1 className="text-xl font-bold text-white mb-2">Generating Your Tasklist…</h1>
                <p className="text-slate-400 text-sm max-w-sm text-center">
                    The AI is generating your operational milestone checklist.
                    This usually completes within 30 seconds. Refresh the page to check.
                </p>
                <Link href={`/organizations/${organizationId}/pitches`} className="back-link">
                    ← Back to Pitches
                </Link>
            </div>
        );
    }

    const grouped = groupTasksByPhase(pitch.tasks);
    const total = pitch.tasks.length;
    const completed = pitch.tasks.filter((t) => t.isCompleted).length;
    const progress = Math.round((completed / total) * 100);

    const phases = [
        { key: "preEvent", label: "Pre-Event Preparation", color: "#6366f1", tasks: grouped.preEvent },
        { key: "eventDay", label: "Event Day", color: "#f59e0b", tasks: grouped.eventDay },
        { key: "postEvent", label: "Post-Event Follow-up", color: "#22c55e", tasks: grouped.postEvent },
    ].filter((p) => p.tasks.length > 0);

    return (
        <div className="pitch-tasks-page">
            {/* ── Header ── */}
            <div className="tasks-header">
                <Link href={`/organizations/${organizationId}/pitches`} className="tasks-back-btn">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Pitches
                </Link>
                <div className="tasks-title-row">
                    <div>
                        <h1 className="tasks-title">
                            <Sparkles className="w-5 h-5 text-indigo-400 inline mr-2" />
                            Operational Tasklist
                        </h1>
                        <p className="tasks-subtitle">{pitch.title}</p>
                    </div>
                    <div className="tasks-progress-card">
                        <div className="progress-numbers">
                            <span className="progress-done">{completed}</span>
                            <span className="progress-sep"> / </span>
                            <span className="progress-total">{total}</span>
                            <span className="progress-label"> tasks done</span>
                        </div>
                        <div className="progress-bar-track">
                            <div
                                className="progress-bar-fill"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <span className="progress-pct">{progress}%</span>
                    </div>
                </div>
            </div>

            {/* ── Phase Columns ── */}
            <div className="tasks-body">
                {phases.map((phase) => (
                    <div key={phase.key} className="phase-section">
                        <div className="phase-header" style={{ borderLeftColor: phase.color }}>
                            <h2 className="phase-title" style={{ color: phase.color }}>
                                {phase.label}
                            </h2>
                            <span className="phase-count">{phase.tasks.length} tasks</span>
                        </div>

                        <div className="task-list">
                            {phase.tasks.map((task) => (
                                <div
                                    key={task.id}
                                    className={`task-card ${task.isCompleted ? "task-done" : ""}`}
                                >
                                    {/* Completion icon */}
                                    <div className="task-check">
                                        {task.isCompleted ? (
                                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                                        ) : (
                                            <Circle className="w-5 h-5 text-slate-600" />
                                        )}
                                    </div>

                                    {/* Task body */}
                                    <div className="task-body">
                                        <div className="task-title-row">
                                            <span className={`task-title-text ${task.isCompleted ? "line-through" : ""}`}>
                                                {task.title}
                                            </span>
                                            <span
                                                className="task-priority"
                                                style={{ color: getPriorityColor(task.priority) }}
                                            >
                                                ● {getPriorityLabel(task.priority)}
                                            </span>
                                        </div>

                                        {task.description && (
                                            <p className="task-description">{task.description}</p>
                                        )}

                                        <div className="task-meta">
                                            {task.assignedRole && (
                                                <span className="task-role">
                                                    <Users className="w-3 h-3" />
                                                    {task.assignedRole}
                                                </span>
                                            )}
                                            {task.dueDayOffset !== 0 && (
                                                <span className="task-offset">
                                                    <Clock className="w-3 h-3" />
                                                    {task.dueDayOffset < 0
                                                        ? `${Math.abs(task.dueDayOffset)}d before event`
                                                        : `${task.dueDayOffset}d after event`}
                                                </span>
                                            )}
                                            {task.dueDayOffset === 0 && (
                                                <span className="task-offset event-day">
                                                    <Clock className="w-3 h-3" />
                                                    Event day
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <style>{`
                .pitch-tasks-page {
                    min-height: 100vh;
                    background: #0f172a;
                    color: #f8fafc;
                    font-family: 'Inter', sans-serif;
                    padding: 2rem 1rem;
                }
                .pitch-tasks-empty {
                    min-height: 60vh;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 0.75rem;
                    text-align: center;
                }
                .back-link {
                    margin-top: 1rem;
                    color: #6366f1;
                    font-size: 0.875rem;
                    text-decoration: none;
                }
                .tasks-header {
                    max-width: 1100px;
                    margin: 0 auto 2rem;
                    display: flex;
                    flex-direction: column;
                    gap: 1.25rem;
                }
                .tasks-back-btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.4rem;
                    color: #64748b;
                    font-size: 0.875rem;
                    text-decoration: none;
                    width: fit-content;
                }
                .tasks-back-btn:hover { color: #94a3b8; }
                .tasks-title-row {
                    display: flex;
                    align-items: flex-start;
                    justify-content: space-between;
                    gap: 1.5rem;
                    flex-wrap: wrap;
                }
                .tasks-title {
                    font-size: 1.5rem;
                    font-weight: 700;
                    background: linear-gradient(135deg, #6366f1, #8b5cf6);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    display: flex;
                    align-items: center;
                }
                .tasks-subtitle { color: #94a3b8; font-size: 0.9rem; margin-top: 0.25rem; }
                .tasks-progress-card {
                    background: #1e293b;
                    border: 1px solid #334155;
                    border-radius: 12px;
                    padding: 1rem 1.25rem;
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                    min-width: 220px;
                }
                .progress-numbers { font-size: 0.85rem; color: #94a3b8; }
                .progress-done { font-size: 1.5rem; font-weight: 700; color: #6366f1; }
                .progress-total { font-size: 1.1rem; font-weight: 600; color: #e2e8f0; }
                .progress-bar-track {
                    background: #0f172a;
                    border-radius: 9999px;
                    height: 6px;
                    overflow: hidden;
                }
                .progress-bar-fill {
                    height: 100%;
                    background: linear-gradient(90deg, #6366f1, #8b5cf6);
                    border-radius: 9999px;
                    transition: width 0.3s ease;
                }
                .progress-pct { font-size: 0.75rem; color: #64748b; }
                .tasks-body {
                    max-width: 1100px;
                    margin: 0 auto;
                    display: flex;
                    flex-direction: column;
                    gap: 2rem;
                }
                .phase-section { display: flex; flex-direction: column; gap: 0.75rem; }
                .phase-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    border-left: 3px solid;
                    padding-left: 0.75rem;
                }
                .phase-title { font-size: 1rem; font-weight: 600; }
                .phase-count { font-size: 0.75rem; color: #64748b; }
                .task-list { display: flex; flex-direction: column; gap: 0.5rem; }
                .task-card {
                    background: #1e293b;
                    border: 1px solid #334155;
                    border-radius: 10px;
                    padding: 0.875rem 1rem;
                    display: flex;
                    align-items: flex-start;
                    gap: 0.75rem;
                    transition: border-color 0.15s;
                }
                .task-card:hover { border-color: #475569; }
                .task-done { opacity: 0.55; }
                .task-check { flex-shrink: 0; padding-top: 1px; }
                .task-body { flex: 1; display: flex; flex-direction: column; gap: 0.35rem; }
                .task-title-row { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; }
                .task-title-text { font-size: 0.9rem; font-weight: 500; color: #e2e8f0; }
                .line-through { text-decoration: line-through; color: #64748b; }
                .task-priority { font-size: 0.7rem; font-weight: 600; white-space: nowrap; }
                .task-description { font-size: 0.8rem; color: #64748b; line-height: 1.5; }
                .task-meta { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
                .task-role, .task-offset {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.25rem;
                    font-size: 0.72rem;
                    color: #94a3b8;
                    background: #0f172a;
                    padding: 0.2rem 0.5rem;
                    border-radius: 6px;
                }
                .task-offset.event-day { color: #f59e0b; }
                @media (max-width: 640px) {
                    .tasks-title-row { flex-direction: column; }
                    .tasks-progress-card { width: 100%; }
                }
            `}</style>
        </div>
    );
}
