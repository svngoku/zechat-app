import { z } from "zod";
import { searchTopDocuments, searchTopSnippets } from "./zeroentropy";

const searchDocumentsParamsSchema = z.object({
  query: z
    .string()
    .describe("The search query to find relevant documents"),
  collection: z
    .string()
    .describe("The collection name to search in (optional, uses default if not provided)")
    .optional(),
  limit: z
    .number()
    .int()
    .min(1)
    .max(20)
    .describe("Maximum number of documents to return (default: 5)")
    .default(5),
  useReranker: z
    .boolean()
    .describe("Whether to use the reranker for better result quality")
    .default(false),
});

/**
 * Tool for searching documents in ZeroEntropy collections.
 * Performs hybrid search across documents using semantic similarity.
 */
export const searchDocumentsTool = {
  description:
    "Search for relevant documents in the knowledge base using hybrid search. " +
    "Use this when you need to find complete documents or broader context about a topic. " +
    "Returns top matching documents with their content, paths, and relevance scores.",
  inputSchema: searchDocumentsParamsSchema,
  execute: async (args: z.infer<typeof searchDocumentsParamsSchema>) => {
    try {
      const results = await searchTopDocuments(args);

      return {
        success: true,
        query: args.query,
        count: results.length,
        results: results.map((r) => ({
          id: r.id,
          content: r.content,
          path: r.path,
          score: r.score,
          rank: r.rank,
        })),
      };
    } catch (error) {
      console.error("Tool execution error (searchDocuments):", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to search documents",
        query: args.query,
        count: 0,
        results: [],
      };
    }
  },
};

const searchSnippetsParamsSchema = z.object({
    query: z
      .string()
      .describe("The search query to find relevant snippets"),
    collection: z
      .string()
      .describe("The collection name to search in (optional, uses default if not provided)")
      .optional(),
    limit: z
      .number()
      .int()
      .min(1)
      .max(20)
      .describe("Maximum number of snippets to return (default: 5)")
      .default(5),
    granularity: z
      .enum(["fine", "coarse"])
      .describe("Snippet granularity: 'fine' for detailed snippets, 'coarse' for larger chunks")
      .default("fine"),
    useReranker: z
      .boolean()
      .describe("Whether to use the reranker for better result quality")
      .default(false),
});

/**
 * Tool for searching snippets in ZeroEntropy collections.
 * Performs fine-grained hybrid search for specific text snippets.
 */
export const searchSnippetsTool = {
  description:
    "Search for specific text snippets in the knowledge base using fine-grained hybrid search. " +
    "Use this when you need precise, detailed information or specific facts. " +
    "Returns top matching snippets with their content, source paths, and relevance scores.",
  inputSchema: searchSnippetsParamsSchema,
  execute: async (args: z.infer<typeof searchSnippetsParamsSchema>) => {
    try {
      const results = await searchTopSnippets(args);

      return {
        success: true,
        query: args.query,
        granularity: args.granularity,
        count: results.length,
        results: results.map((r) => ({
          id: r.id,
          content: r.content,
          path: r.path,
          score: r.score,
          rank: r.rank,
        })),
      };
    } catch (error) {
      console.error("Tool execution error (searchSnippets):", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to search snippets",
        query: args.query,
        count: 0,
        results: [],
      };
    }
  },
};

/**
 * Export all ZeroEntropy tools for registration in AI SDK
 */
export const zeroEntropyTools = {
  searchDocuments: searchDocumentsTool,
  searchSnippets: searchSnippetsTool,
};
