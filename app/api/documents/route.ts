import { NextRequest, NextResponse } from "next/server";
import {
  listDocuments,
  getDocumentInfo,
  addDocument,
  updateDocument,
  deleteDocument,
} from "@/lib/collection-service";
import type { DocumentAddParams, DocumentUpdateParams } from "@/lib/collection-types";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const collection = searchParams.get("collection");
    const path = searchParams.get("path");
    const includeContent = searchParams.get("includeContent") === "true";
    const limit = searchParams.get("limit");
    const pathPrefix = searchParams.get("pathPrefix");
    const pathGt = searchParams.get("pathGt");

    if (!collection) {
      return NextResponse.json(
        { error: "Collection name is required" },
        { status: 400 }
      );
    }

    if (path) {
      const document = await getDocumentInfo(collection, path, includeContent);
      return NextResponse.json({ document });
    }

    const documents = await listDocuments(
      collection,
      limit ? parseInt(limit) : 100,
      pathPrefix || undefined,
      pathGt || undefined
    );

    return NextResponse.json(documents);
  } catch (error) {
    console.error("Error fetching documents:", error);
    
    if (error instanceof Error && error.message.includes("404")) {
      return NextResponse.json(
        { error: "Document or collection not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch documents" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: DocumentAddParams = await request.json();

    if (!body.collection_name || !body.path || !body.content) {
      return NextResponse.json(
        { error: "Collection name, path, and content are required" },
        { status: 400 }
      );
    }

    const result = await addDocument(body);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Error adding document:", error);
    
    if (error instanceof Error) {
      if (error.message.includes("404")) {
        return NextResponse.json(
          { error: "Collection not found" },
          { status: 404 }
        );
      }
      if (error.message.includes("409")) {
        return NextResponse.json(
          { error: "Document already exists" },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to add document" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body: DocumentUpdateParams = await request.json();

    if (!body.collection_name || !body.path) {
      return NextResponse.json(
        { error: "Collection name and path are required" },
        { status: 400 }
      );
    }

    const result = await updateDocument(body);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error updating document:", error);
    
    if (error instanceof Error && error.message.includes("404")) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update document" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const collection = searchParams.get("collection");
    const path = searchParams.get("path");

    if (!collection || !path) {
      return NextResponse.json(
        { error: "Collection name and path are required" },
        { status: 400 }
      );
    }

    const result = await deleteDocument({
      collection_name: collection,
      path,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error deleting document:", error);
    
    if (error instanceof Error && error.message.includes("404")) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete document" },
      { status: 500 }
    );
  }
}
