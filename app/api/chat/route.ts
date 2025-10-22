import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { NextRequest } from "next/server";
import { zeroEntropyTools } from "@/lib/zeroentropy-tools";
import { getEnv } from "@/lib/env";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    // Validate environment
    getEnv();

    // Parse request body
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "Messages array is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Create streaming response with tools
    const result = streamText({
      model: openai("gpt-4o-mini"),
      system: `You are a helpful AI assistant with access to a knowledge base powered by ZeroEntropy.

When users ask questions that would benefit from external knowledge or facts, use the available search tools:
- Use 'searchSnippets' for specific, detailed information or precise facts
- Use 'searchDocuments' for broader context or when you need complete document content

Always cite your sources when using information from the knowledge base by mentioning the document path.
Provide clear, accurate, and helpful responses based on the retrieved information.`,
      messages,
      tools: zeroEntropyTools,
    });

    return result.toTextStreamResponse();
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
