"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  fetchCollections,
  createCollection,
  deleteCollection,
  fetchCollectionStats,
} from "@/lib/collection-client";
import type { CollectionStats } from "@/lib/collection-types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PlusIcon, TrashIcon, FolderIcon, FileTextIcon } from "lucide-react";
import { toast } from "sonner";

export default function CollectionsPage() {
  const router = useRouter();
  const [collections, setCollections] = useState<string[]>([]);
  const [collectionStats, setCollectionStats] = useState<Map<string, CollectionStats>>(new Map());
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadCollections();
  }, []);

  async function loadCollections() {
    try {
      setLoading(true);
      const data = await fetchCollections();
      setCollections(data);

      const statsMap = new Map<string, CollectionStats>();
      await Promise.all(
        data.map(async (name) => {
          try {
            const stats = await fetchCollectionStats(name);
            statsMap.set(name, stats);
          } catch (error) {
            console.error(`Failed to load stats for ${name}:`, error);
          }
        })
      );
      setCollectionStats(statsMap);
    } catch (error) {
      console.error("Failed to load collections:", error);
      toast.error("Failed to load collections");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateCollection() {
    if (!newCollectionName.trim()) {
      toast.error("Collection name is required");
      return;
    }

    try {
      setIsCreating(true);
      await createCollection(newCollectionName.trim());
      toast.success("Collection created successfully");
      setIsCreateOpen(false);
      setNewCollectionName("");
      await loadCollections();
    } catch (error) {
      console.error("Failed to create collection:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create collection");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleDeleteCollection(name: string) {
    try {
      setIsDeleting(true);
      await deleteCollection(name);
      toast.success("Collection deleted successfully");
      setDeleteTarget(null);
      await loadCollections();
    } catch (error) {
      console.error("Failed to delete collection:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete collection");
    } finally {
      setIsDeleting(false);
    }
  }

  function handleCollectionClick(name: string) {
    router.push(`/collections/${encodeURIComponent(name)}`);
  }

  function formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Collections</h1>
          <p className="text-muted-foreground mt-2">
            Manage your ZeroEntropy document collections
          </p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusIcon />
              New Collection
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Collection</DialogTitle>
              <DialogDescription>
                Enter a name for your new collection. Collection names should be unique.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Collection Name</Label>
                <Input
                  id="name"
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  placeholder="my-collection"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !isCreating) {
                      handleCreateCollection();
                    }
                  }}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)} disabled={isCreating}>
                Cancel
              </Button>
              <Button onClick={handleCreateCollection} disabled={isCreating}>
                {isCreating ? "Creating..." : "Create Collection"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-1/2 mt-2" />
              </CardHeader>
              <CardContent>
                <div className="h-4 bg-muted rounded w-full" />
                <div className="h-4 bg-muted rounded w-2/3 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : collections.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <FolderIcon className="size-12 text-muted-foreground" />
            <div>
              <h3 className="font-semibold text-lg">No collections yet</h3>
              <p className="text-muted-foreground text-sm mt-1">
                Create your first collection to get started
              </p>
            </div>
            <Button onClick={() => setIsCreateOpen(true)}>
              <PlusIcon />
              Create Collection
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {collections.map((name) => {
            const stats = collectionStats.get(name);
            return (
              <Card
                key={name}
                className="cursor-pointer transition-all hover:shadow-md"
                onClick={() => handleCollectionClick(name)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <FolderIcon className="size-5 text-primary shrink-0" />
                      <CardTitle className="truncate">{name}</CardTitle>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(name);
                      }}
                      className="shrink-0"
                    >
                      <TrashIcon className="size-4" />
                    </Button>
                  </div>
                  {stats ? (
                    <CardDescription>
                      {stats.documentCount} {stats.documentCount === 1 ? "document" : "documents"}
                    </CardDescription>
                  ) : (
                    <CardDescription>Loading stats...</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {stats && (
                      <>
                        <Badge variant="outline">
                          <FileTextIcon />
                          {stats.documentCount}
                        </Badge>
                        <Badge variant="outline">{formatBytes(stats.totalSize)}</Badge>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AlertDialog open={deleteTarget !== null} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Collection</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the collection <strong>{deleteTarget}</strong>? This
              action cannot be undone and will delete all documents in this collection.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && handleDeleteCollection(deleteTarget)}
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
