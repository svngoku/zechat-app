import { openai } from "@ai-sdk/openai";
import { NextRequest } from "next/server";
import { zeroEntropyTools } from "@/lib/zeroentropy-tools";
import { getEnv } from "@/lib/env";
import { generateText, CoreMessage, stepCountIs } from 'ai';

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    getEnv();

    // Parse request body
    const body = await req.json();
    const messages: CoreMessage[] = body.messages;
    const targetCollection: string | undefined = body.collection;

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "Messages array is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Build system prompt with collection context
    const systemPrompt = targetCollection
      ? `You are a helpful AI assistant with access to a knowledge base powered by ZeroEntropy.

The user is currently searching in the "${targetCollection}" collection.
When using search tools, ALWAYS specify this collection in your search queries.

When users ask questions that would benefit from external knowledge or facts, use the available search tools:
- Use 'searchSnippets' for specific, detailed information or precise facts
- Use 'searchDocuments' for broader context or when you need complete document content

IMPORTANT: Always include "collection": "${targetCollection}" in your tool calls.`
      : `You are a helpful AI assistant with access to a knowledge base powered by ZeroEntropy.

When users ask questions that would benefit from external knowledge or facts, use the available search tools:
- Use 'searchSnippets' for specific, detailed information or precise facts
- Use 'searchDocuments' for broader context or when you need complete document content`;

    // Generate text response (non-streaming) with automatic tool execution
    const response = await generateText({
      model: openai("gpt-4.1"),
      messages,
      system: systemPrompt,
      tools: zeroEntropyTools,
      stopWhen: stepCountIs(10)
    });

    if (response.toolCalls && response.toolCalls.length > 0) {
      console.log(`Tool calls executed: ${response.toolCalls.length}`);
    }

    // Map AI SDK toolCalls to our schema (with 'args' property)
    const toolCalls = (response.toolCalls || []).map(call => ({
      toolCallId: call.toolCallId,
      toolName: call.toolName,
      args: (call as unknown as { args?: Record<string, unknown> }).args || {},
    }));

    // Map AI SDK toolResults to our schema
    const toolResults = (response.toolResults || []).map(result => ({
      toolCallId: result.toolCallId,
      toolName: result.toolName,
      args: (result as unknown as { args?: Record<string, unknown> }).args || {},
      result: (result as unknown as { result?: unknown }).result,
    }));

    return new Response(
      JSON.stringify({
        text: response.text,
        usage: response.usage,
        finishReason: response.finishReason,
        toolCalls,
        toolResults,
        stepsCount: response.steps?.length || 0,
      }),
      { 
        status: 200,
        headers: { "Content-Type": "application/json" } 
      }
    );
    
  } catch (error) {
    console.error("Chat API error:", error);

    // Return structured error response
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
