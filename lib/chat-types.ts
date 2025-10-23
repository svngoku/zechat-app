import { z } from "zod";

// ============================================================================
// Core Message Types
// ============================================================================

export const chatMessageSchema = z.object({
  id: z.string().optional(),
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
  createdAt: z.number().optional(),
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;

// ============================================================================
// Tool Types
// ============================================================================

export const toolCallSchema = z.object({
  toolCallId: z.string(),
  toolName: z.string(),
  args: z.record(z.string(), z.unknown()),
  type: z.literal("tool-call").optional(),
});

export type ToolCall = z.infer<typeof toolCallSchema>;

export const toolResultSchema = z.object({
  toolCallId: z.string(),
  toolName: z.string(),
  args: z.record(z.string(), z.unknown()),
  result: z.unknown(),
  type: z.literal("tool-result").optional(),
});

export type ToolResult = z.infer<typeof toolResultSchema>;

// Union type for tool events
export type ToolEvent = 
  | (ToolCall & { type: "tool-call" })
  | (ToolResult & { type: "tool-result" });

// ============================================================================
// API Response Types
// ============================================================================

export const usageSchema = z.object({
  inputTokens: z.number(),
  outputTokens: z.number(),
  totalTokens: z.number(),
  reasoningTokens: z.number().optional(),
  cachedInputTokens: z.number().optional(),
});

export type Usage = z.infer<typeof usageSchema>;

export const chatApiResponseSchema = z.object({
  text: z.string(),
  finishReason: z.string(),
  usage: usageSchema,
  stepsCount: z.number(),
  toolCalls: z.array(toolCallSchema),
  toolResults: z.array(toolResultSchema),
});

export type ChatApiResponse = z.infer<typeof chatApiResponseSchema>;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Maps API response to chat message and tool events
 */
export function mapApiResponseToChatUpserts(response: ChatApiResponse): {
  assistantMessage: ChatMessage | null;
  toolEvents: ToolEvent[];
} {
  const toolEvents: ToolEvent[] = [];

  // Add tool calls
  response.toolCalls.forEach((call) => {
    toolEvents.push({
      ...call,
      type: "tool-call" as const,
    });
  });

  // Add tool results
  response.toolResults.forEach((result) => {
    toolEvents.push({
      ...result,
      type: "tool-result" as const,
    });
  });

  // Create assistant message if there's text
  const assistantMessage: ChatMessage | null = response.text
    ? {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: response.text,
        createdAt: Date.now(),
      }
    : null;

  return {
    assistantMessage,
    toolEvents,
  };
}

/**
 * Correlates tool calls with their results by toolCallId
 */
export function correlateToolCallsWithResults(
  toolCalls: ToolCall[],
  toolResults: ToolResult[]
): Array<{ call: ToolCall; result: ToolResult | null }> {
  return toolCalls.map((call) => {
    const result =
      toolResults.find((r) => r.toolCallId === call.toolCallId) || null;
    return { call, result };
  });
}
