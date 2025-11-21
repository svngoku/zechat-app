"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { ChatSidebar } from "@/components/chat-ui/chat-sidebar";
import { getConversationsForSidebar } from "@/lib/chat-storage";
import type { ConversationItem } from "@/components/chat-ui/chat-sidebar";
import {
  fetchDocuments,
  addDocument,
  deleteDocument,
  fetchDocumentInfo,
} from "@/lib/collection-client";
import type { DocumentInfo, DocumentAddParams, IndexStatus } from "@/lib/collection-types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  PlusIcon,
  TrashIcon,
  ArrowLeftIcon,
  FileTextIcon,
  EyeIcon,
  RefreshCwIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

function CollectionDetailContent() {
  const params = useParams();
  const router = useRouter();
  const collectionName = decodeURIComponent(params.name as string);

  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [viewDocument, setViewDocument] = useState<DocumentInfo | null>(null);
  const [isLoadingContent, setIsLoadingContent] = useState(false);

  const [newDoc, setNewDoc] = useState({
    path: "",
    text: "",
    overwrite: false,
  });

  useEffect(() => {
    loadDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionName]);

  async function loadDocuments() {
    try {
      setLoading(true);
      const data = await fetchDocuments(collectionName, 100);
      setDocuments(data);
    } catch (error) {
      console.error("Failed to load documents:", error);
      toast.error("Failed to load documents");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddDocument() {
    if (!newDoc.path.trim() || !newDoc.text.trim()) {
      toast.error("Document path and content are required");
      return;
    }

    try {
      setIsAdding(true);
      const params: DocumentAddParams = {
        collection_name: collectionName,
        path: newDoc.path.trim(),
        content: {
          type: "text",
          text: newDoc.text,
        },
        overwrite: newDoc.overwrite,
      };

      await addDocument(params);
      toast.success("Document added successfully");
      setIsAddOpen(false);
      setNewDoc({ path: "", text: "", overwrite: false });
      await loadDocuments();
    } catch (error) {
      console.error("Failed to add document:", error);
      toast.error(error instanceof Error ? error.message : "Failed to add document");
    } finally {
      setIsAdding(false);
    }
  }

  async function handleDeleteDocument(path: string) {
    try {
      setIsDeleting(true);
      await deleteDocument(collectionName, path);
      toast.success("Document deleted successfully");
      setDeleteTarget(null);
      await loadDocuments();
    } catch (error) {
      console.error("Failed to delete document:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete document");
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleViewDocument(path: string) {
    try {
      setIsLoadingContent(true);
      const doc = await fetchDocumentInfo(collectionName, path, true);
      setViewDocument(doc);
    } catch (error) {
      console.error("Failed to load document content:", error);
      toast.error("Failed to load document content");
    } finally {
      setIsLoadingContent(false);
    }
  }

  function getStatusBadge(status: IndexStatus) {
    switch (status) {
      case "indexed":
        return (
          <Badge variant="default" className="bg-green-600">
            <CheckCircleIcon />
            Indexed
          </Badge>
        );
      case "indexing":
        return (
          <Badge variant="secondary">
            <RefreshCwIcon className="animate-spin" />
            Indexing
          </Badge>
        );
      case "not_parsed":
        return (
          <Badge variant="outline">
            <ClockIcon />
            Not Parsed
          </Badge>
        );
      case "error":
        return (
          <Badge variant="destructive">
            <XCircleIcon />
            Error
          </Badge>
        );
    }
  }

  function formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" onClick={() => router.push("/collections")}>
          <ArrowLeftIcon />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">{collectionName}</h1>
          <p className="text-muted-foreground mt-2">
            {documents.length} {documents.length === 1 ? "document" : "documents"}
          </p>
        </div>
        <Button onClick={() => setIsAddOpen(true)}>
          <PlusIcon />
          Add Document
        </Button>
      </div>

      {loading ? (
        <Card className="p-12">
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </Card>
      ) : documents.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <FileTextIcon className="size-12 text-muted-foreground" />
            <div>
              <h3 className="font-semibold text-lg">No documents yet</h3>
              <p className="text-muted-foreground text-sm mt-1">
                Add your first document to this collection
              </p>
            </div>
            <Button onClick={() => setIsAddOpen(true)}>
              <PlusIcon />
              Add Document
            </Button>
          </div>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Path</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Pages</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell className="font-medium">{doc.path}</TableCell>
                  <TableCell>{getStatusBadge(doc.index_status)}</TableCell>
                  <TableCell>{formatBytes(doc.size)}</TableCell>
                  <TableCell>{doc.num_pages}</TableCell>
                  <TableCell>
                    {formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleViewDocument(doc.path)}
                        title="View document"
                      >
                        <EyeIcon className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setDeleteTarget(doc.path)}
                        title="Delete document"
                      >
                        <TrashIcon className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Add Document Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Document</DialogTitle>
            <DialogDescription>
              Add a new text document to the {collectionName} collection.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="path">Document Path</Label>
              <Input
                id="path"
                value={newDoc.path}
                onChange={(e) => setNewDoc({ ...newDoc, path: e.target.value })}
                placeholder="docs/my-document.txt"
              />
              <p className="text-muted-foreground text-xs">
                A unique path identifier for this document
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="text">Content</Label>
              <textarea
                id="text"
                value={newDoc.text}
                onChange={(e) => setNewDoc({ ...newDoc, text: e.target.value })}
                placeholder="Enter document content here..."
                className="min-h-[200px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="overwrite"
                checked={newDoc.overwrite}
                onChange={(e) => setNewDoc({ ...newDoc, overwrite: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="overwrite" className="text-sm font-normal cursor-pointer">
                Overwrite if document already exists
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)} disabled={isAdding}>
              Cancel
            </Button>
            <Button onClick={handleAddDocument} disabled={isAdding}>
              {isAdding ? "Adding..." : "Add Document"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Document Dialog */}
      <Dialog open={viewDocument !== null} onOpenChange={() => setViewDocument(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{viewDocument?.path}</DialogTitle>
            <DialogDescription>Document details</DialogDescription>
          </DialogHeader>
          {viewDocument && (
            <div className="flex items-center gap-2 -mt-2 mb-2">
              {getStatusBadge(viewDocument.index_status)}
              <Badge variant="outline">{formatBytes(viewDocument.size)}</Badge>
              <Badge variant="outline">{viewDocument.num_pages} pages</Badge>
            </div>
          )}
          <ScrollArea className="h-[400px] w-full rounded border p-4">
            {isLoadingContent ? (
              <div className="flex items-center justify-center h-full">
                <RefreshCwIcon className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : viewDocument?.content ? (
              <pre className="text-sm whitespace-pre-wrap">{viewDocument.content}</pre>
            ) : (
              <p className="text-muted-foreground">No content available</p>
            )}
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDocument(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteTarget !== null} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteTarget}</strong>? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && handleDeleteDocument(deleteTarget)}
              disabled={isDeleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CollectionDetailSidebar() {
  const [conversations, setConversations] = useState<ConversationItem[]>([]);

  useEffect(() => {
    const loadConversations = async () => {
      const convs = await getConversationsForSidebar();
      setConversations(convs);
    };
    loadConversations();
  }, []);

  return <ChatSidebar conversations={conversations} newChatDisabled={false} />;
}

export default function CollectionDetailPage() {
  return (
    <SidebarProvider>
      <CollectionDetailSidebar />
      <SidebarInset>
        <CollectionDetailContent />
      </SidebarInset>
    </SidebarProvider>
  );
}
