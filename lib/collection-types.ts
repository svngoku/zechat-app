export interface Collection {
  name: string;
}

export interface CollectionListResponse {
  collection_names: string[];
}

export type IndexStatus = "not_parsed" | "indexed" | "indexing" | "error";

export interface DocumentInfo {
  id: string;
  collection_name: string;
  path: string;
  metadata: { [key: string]: string | string[] };
  index_status: IndexStatus;
  created_at: string;
  size: number;
  num_pages: number;
  file_url: string;
  content?: string;
}

export interface DocumentListResponse {
  documents: DocumentInfo[];
}

export interface DocumentAddParams {
  collection_name: string;
  path: string;
  content: {
    type: "text";
    text: string;
  };
  metadata?: { [key: string]: string | string[] };
  overwrite?: boolean;
}

export interface DocumentUpdateParams {
  collection_name: string;
  path: string;
  metadata?: { [key: string]: string | string[] };
  index_status?: "not_parsed" | "not_indexed" | null;
}

export interface DocumentDeleteParams {
  collection_name: string;
  path: string;
}

export interface CollectionStats {
  name: string;
  documentCount: number;
  totalSize: number;
}
