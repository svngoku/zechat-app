import { NextRequest, NextResponse } from "next/server";
import {
  listCollections,
  createCollection,
  deleteCollection,
  getCollectionStats,
} from "@/lib/collection-service";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const name = searchParams.get("name");
    const stats = searchParams.get("stats");

    if (name && stats === "true") {
      const collectionStats = await getCollectionStats(name);
      return NextResponse.json(collectionStats);
    }

    const collections = await listCollections();
    return NextResponse.json(collections);
  } catch (error) {
    console.error("Error fetching collections:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch collections" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "Collection name is required" },
        { status: 400 }
      );
    }

    const result = await createCollection(name);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Error creating collection:", error);
    
    if (error instanceof Error && error.message.includes("already exists")) {
      return NextResponse.json(
        { error: error.message },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create collection" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const name = searchParams.get("name");

    if (!name) {
      return NextResponse.json(
        { error: "Collection name is required" },
        { status: 400 }
      );
    }

    const result = await deleteCollection(name);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error deleting collection:", error);
    
    if (error instanceof Error && error.message.includes("404")) {
      return NextResponse.json(
        { error: "Collection not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete collection" },
      { status: 500 }
    );
  }
}
