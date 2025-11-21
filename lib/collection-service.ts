import { ZeroEntropy } from "zeroentropy";
import { getEnv } from "./env";
import type {
  CollectionListResponse,
  DocumentInfo,
  DocumentListResponse,
  DocumentAddParams,
  DocumentUpdateParams,
  DocumentDeleteParams,
  CollectionStats,
} from "./collection-types";

let clientInstance: ZeroEntropy | null = null;

function getClient(): ZeroEntropy {
  if (!clientInstance) {
    const env = getEnv();
    clientInstance = new ZeroEntropy({ apiKey: env.ZEROENTROPY_API_KEY });
  }
  return clientInstance;
}

export async function listCollections(): Promise<CollectionListResponse> {
  const client = getClient();
  const response = await client.collections.getList();
  return { collection_names: response.collection_names };
}

export async function createCollection(name: string): Promise<{ message: string }> {
  const client = getClient();
  try {
    await client.collections.add({ collection_name: name });
    return { message: "Collection created successfully" };
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("409")) {
      throw new Error("Collection already exists");
    }
    throw error;
  }
}

export async function deleteCollection(name: string): Promise<{ message: string }> {
  const client = getClient();
  await client.collections.delete({ collection_name: name });
  return { message: "Collection deleted successfully" };
}

export async function listDocuments(
  collectionName: string,
  limit = 100,
  pathPrefix?: string,
  pathGt?: string
): Promise<DocumentListResponse> {
  const client = getClient();
  const response = await client.documents.getInfoList({
    collection_name: collectionName,
    limit,
    ...(pathPrefix && { path_prefix: pathPrefix }),
    ...(pathGt && { path_gt: pathGt }),
  });

  return { documents: response.documents as DocumentInfo[] };
}

export async function getDocumentInfo(
  collectionName: string,
  path: string,
  includeContent = false
): Promise<DocumentInfo> {
  const client = getClient();
  const response = await client.documents.getInfo({
    collection_name: collectionName,
    path,
    include_content: includeContent,
  });

  return response.document as DocumentInfo;
}

export async function addDocument(params: DocumentAddParams): Promise<{ message: string }> {
  const client = getClient();
  
  await client.documents.add({
    collection_name: params.collection_name,
    path: params.path,
    content: params.content,
    ...(params.metadata && { metadata: params.metadata }),
    ...(params.overwrite !== undefined && { overwrite: params.overwrite }),
  });

  return { message: "Document added successfully" };
}

export async function updateDocument(params: DocumentUpdateParams): Promise<{ message: string }> {
  const client = getClient();
  await client.documents.update({
    collection_name: params.collection_name,
    path: params.path,
    ...(params.metadata && { metadata: params.metadata }),
    ...(params.index_status && { index_status: params.index_status }),
  });

  return { message: "Document updated successfully" };
}

export async function deleteDocument(params: DocumentDeleteParams): Promise<{ message: string }> {
  const client = getClient();
  await client.documents.delete({
    collection_name: params.collection_name,
    path: params.path,
  });

  return { message: "Document deleted successfully" };
}

export async function getCollectionStats(collectionName: string): Promise<CollectionStats> {
  const documents = await listDocuments(collectionName, 1000);
  
  const stats: CollectionStats = {
    name: collectionName,
    documentCount: documents.documents.length,
    totalSize: documents.documents.reduce((sum, doc) => sum + doc.size, 0),
  };

  return stats;
}
