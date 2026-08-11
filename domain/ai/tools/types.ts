export interface ToolContext {
    userId: string;
    orgId: string;
    role: string;
    toolArgs: Record<string, unknown>;
}

export type ToolHandler = (ctx: ToolContext) => Promise<unknown>;
