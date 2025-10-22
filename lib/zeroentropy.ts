import { ZeroEntropy } from "zeroentropy";
import { getEnv } from "./env";

/**
 * Normalized search result that can be displayed in the UI
 */
export interface SearchResult {
  id: string;
  content: string;
  path: string;
  score: number;
  rank: number;
  metadata?: Record<string, unknown>;
}

/**
 * Search parameters for ZeroEntropy queries
 */
export interface SearchParams {
  query: string;
  collection?: string;
  limit?: number;
  granularity?: "fine" | "coarse";
  useReranker?: boolean;
}

/**
 * Custom error for ZeroEntropy operations
 */
export class ZeroEntropyError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "ZeroEntropyError";
  }
}

let clientInstance: ZeroEntropy | null = null;

/**
 * Get or create singleton ZeroEntropy client
 */
function getClient(): ZeroEntropy {
  if (!clientInstance) {
    try {
      const env = getEnv();
      clientInstance = new ZeroEntropy({ apiKey: env.ZEROENTROPY_API_KEY });
    } catch (error) {
      throw new ZeroEntropyError(
        "Failed to initialize ZeroEntropy client. Check your API key.",
        error
      );
    }
  }
  return clientInstance;
}

/**
 * Search for top documents in a collection
 */
export async function searchTopDocuments(
  params: SearchParams
): Promise<SearchResult[]> {
  try {
    const env = getEnv();
    const client = getClient();

    const response = await client.queries.topDocuments({
      collection_name: params.collection || env.ZEROENTROPY_COLLECTION_NAME,
      query: params.query,
      k: params.limit || 5,
      ...(params.useReranker && { reranker: "zerank-1" as const }),
    });

    return response.results.map((result: any, index: number) => ({
      id: result.document_id || `doc-${index}`,
      content: result.content || "",
      path: result.path || "",
      score: result.score || 0,
      rank: index + 1,
      metadata: result.metadata,
    }));
  } catch (error) {
    console.error("Error searching documents:", error);
    throw new ZeroEntropyError(
      `Failed to search documents: ${error instanceof Error ? error.message : "Unknown error"}`,
      error
    );
  }
}

/**
 * Search for top snippets in a collection
 */
export async function searchTopSnippets(
  params: SearchParams
): Promise<SearchResult[]> {
  try {
    const env = getEnv();
    const client = getClient();

    const response = await client.queries.topSnippets({
      collection_name: params.collection || env.ZEROENTROPY_COLLECTION_NAME,
      query: params.query,
      k: params.limit || 5,
      ...(params.useReranker && { reranker: "zerank-1" as const }),
    });

    return response.results.map((result: any, index: number) => ({
      id: result.snippet_id || `snippet-${index}`,
      content: result.content || "",
      path: result.path || "",
      score: result.score || 0,
      rank: index + 1,
      metadata: result.metadata,
    }));
  } catch (error) {
    console.error("Error searching snippets:", error);
    throw new ZeroEntropyError(
      `Failed to search snippets: ${error instanceof Error ? error.message : "Unknown error"}`,
      error
    );
  }
}

/**
 * Health check for ZeroEntropy client
 */
export async function checkHealth(): Promise<boolean> {
  try {
    const client = getClient();
    await client.status.getStatus();
    return true;
  } catch (error) {
    console.error("ZeroEntropy health check failed:", error);
    return false;
  }
}
