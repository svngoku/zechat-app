import { NextRequest, NextResponse } from "next/server";
import { ZeroEntropy } from "zeroentropy";

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.ZEROENTROPY_API_KEY;
    const collection_name = process.env.ZEROENTROPY_COLLECTION_NAME

    if (!apiKey) {
      return NextResponse.json(
        { error: "ZEROENTROPY_API_KEY environment variable not set" },
        { status: 500 }
      );
    }

    const { query, useReranker = false } = await request.json();

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    const zclient = new ZeroEntropy({ apiKey });

    // Search the collection using fine-grained snippets
    const searchParams = {
      collection_name: collection_name,
      query: query,
      k: 5,
      granularity: "fine" as const,
      ...(useReranker && { reranker: "zerank-1" as const }),
    };

    const response = await zclient.queries.topSnippets(searchParams);

    const results = response.results.map((result: { content?: string; path?: string; score?: number }, index: number) => ({
      content: result.content || "",
      path: result.path || "",
      score: result.score || 0,
      rank: index + 1,
    }));

    return NextResponse.json(
      {
        success: true,
        results: results,
        query: query,
        rerankerUsed: useReranker,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error searching collection:", error);
    return NextResponse.json(
      {
        error: "Failed to search collection",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
