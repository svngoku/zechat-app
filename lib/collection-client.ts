"use client";

import type {
  CollectionListResponse,
  CollectionStats,
  DocumentInfo,
  DocumentListResponse,
  DocumentAddParams,
  DocumentUpdateParams,
} from "./collection-types";

export async function fetchCollections(): Promise<string[]> {
  const response = await fetch("/api/collections");
  if (!response.ok) {
    throw new Error("Failed to fetch collections");
  }
  const data: CollectionListResponse = await response.json();
  return data.collection_names;
}

export async function fetchCollectionStats(name: string): Promise<CollectionStats> {
  const response = await fetch(`/api/collections?name=${encodeURIComponent(name)}&stats=true`);
  if (!response.ok) {
    throw new Error("Failed to fetch collection stats");
  }
  return response.json();
}

export async function createCollection(name: string): Promise<{ message: string }> {
  const response = await fetch("/api/collections", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create collection");
  }

  return response.json();
}

export async function deleteCollection(name: string): Promise<{ message: string }> {
  const response = await fetch(`/api/collections?name=${encodeURIComponent(name)}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete collection");
  }

  return response.json();
}

export async function fetchDocuments(
  collection: string,
  limit = 100,
  pathPrefix?: string,
  pathGt?: string
): Promise<DocumentInfo[]> {
  const params = new URLSearchParams({ collection, limit: limit.toString() });
  if (pathPrefix) params.append("pathPrefix", pathPrefix);
  if (pathGt) params.append("pathGt", pathGt);

  const response = await fetch(`/api/documents?${params}`);
  if (!response.ok) {
    throw new Error("Failed to fetch documents");
  }

  const data: DocumentListResponse = await response.json();
  return data.documents;
}

export async function fetchDocumentInfo(
  collection: string,
  path: string,
  includeContent = false
): Promise<DocumentInfo> {
  const params = new URLSearchParams({
    collection,
    path,
    includeContent: includeContent.toString(),
  });

  const response = await fetch(`/api/documents?${params}`);
  if (!response.ok) {
    throw new Error("Failed to fetch document info");
  }

  const data = await response.json();
  return data.document;
}

export async function addDocument(params: DocumentAddParams): Promise<{ message: string }> {
  const response = await fetch("/api/documents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to add document");
  }

  return response.json();
}

export async function updateDocument(params: DocumentUpdateParams): Promise<{ message: string }> {
  const response = await fetch("/api/documents", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update document");
  }

  return response.json();
}

export async function deleteDocument(
  collection: string,
  path: string
): Promise<{ message: string }> {
  const response = await fetch(
    `/api/documents?collection=${encodeURIComponent(collection)}&path=${encodeURIComponent(path)}`,
    { method: "DELETE" }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete document");
  }

  return response.json();
}
