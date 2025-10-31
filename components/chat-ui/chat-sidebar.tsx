"use client";

import { useRouter, useParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { PlusIcon, Search, MoreHorizontal, Trash2 } from "lucide-react";
import { deleteConversation } from "@/lib/chat-storage";

export type ConversationItem = {
  id: string;
  title: string;
  lastMessage?: string;
  timestamp?: number;
};

type ConversationGroup = {
  period: string;
  conversations: ConversationItem[];
};

function groupConversationsByPeriod(
  conversations: ConversationItem[]
): ConversationGroup[] {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  const today: ConversationItem[] = [];
  const yesterday: ConversationItem[] = [];
  const lastWeek: ConversationItem[] = [];
  const lastMonth: ConversationItem[] = [];

  conversations.forEach((conv) => {
    if (!conv.timestamp) return;

    const diff = now - conv.timestamp;
    if (diff < dayMs) {
      today.push(conv);
    } else if (diff < 2 * dayMs) {
      yesterday.push(conv);
    } else if (diff < 7 * dayMs) {
      lastWeek.push(conv);
    } else if (diff < 30 * dayMs) {
      lastMonth.push(conv);
    }
  });

  const groups: ConversationGroup[] = [];
  if (today.length > 0)
    groups.push({ period: "Today", conversations: today });
  if (yesterday.length > 0)
    groups.push({ period: "Yesterday", conversations: yesterday });
  if (lastWeek.length > 0)
    groups.push({ period: "Last 7 days", conversations: lastWeek });
  if (lastMonth.length > 0)
    groups.push({ period: "Last month", conversations: lastMonth });

  return groups;
}

interface ChatSidebarProps {
  onNewChat?: () => void;
  conversations?: ConversationItem[];
  newChatDisabled?: boolean;
  currentConversationId?: string;
  onConversationDeleted?: () => void;
}

export function ChatSidebar({
  onNewChat,
  conversations = [],
  newChatDisabled = false,
  currentConversationId,
  onConversationDeleted,
}: ChatSidebarProps) {
  const router = useRouter();
  const params = useParams();
  const activeId = currentConversationId || (params?.id as string);
  const conversationGroups = groupConversationsByPeriod(conversations);
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConversationClick = (id: string) => {
    if (newChatDisabled) return;
    router.push(`/chat/${id}`);
  };

  const handleNewChatClick = () => {
    if (onNewChat) {
      onNewChat();
    } else {
      router.push("/");
    }
  };

  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConversationToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!conversationToDelete) return;

    setIsDeleting(true);
    try {
      await deleteConversation(conversationToDelete);
      
      // If we're deleting the current conversation, navigate to home
      if (conversationToDelete === activeId) {
        router.push("/");
      }
      
      // Notify parent to refresh conversation list
      onConversationDeleted?.();
    } catch (error) {
      console.error("Failed to delete conversation:", error);
      // TODO: Show error toast
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setConversationToDelete(null);
    }
  };

  return (
    <Sidebar>
      <SidebarHeader className="flex flex-row items-center justify-between gap-2 px-2 py-4">
        <div className="mx-4 flex flex-row items-center gap-2 rounded-lg px-2 py-2">
          <img
            src="/svgs_collection/zeroentropy-dark.svg"
            className="h-auto"
            alt="logo"
          />
        </div>
        <Button variant="ghost" className="size-8">
          <Search className="size-4" />
        </Button>
      </SidebarHeader>
      <SidebarContent className="pt-4">
        <div className="px-4">
          <Button
            variant="outline"
            className="mb-4 flex w-full items-center gap-2 font-sans"
            onClick={handleNewChatClick}
            disabled={newChatDisabled}
          >
            <PlusIcon className="size-4" />
            <span className="font-sans">New Chat</span>
          </Button>
        </div>
        {conversationGroups.length === 0 ? (
          <div className="px-4 font-sans text-sm text-muted-foreground">
            {newChatDisabled ? "Example conversation" : "No conversation history yet"}
          </div>
        ) : (
          conversationGroups.map((group) => (
            <SidebarGroup key={group.period}>
              <SidebarGroupLabel className="font-display font-medium">
                {group.period}
              </SidebarGroupLabel>
              <SidebarMenu>
                {group.conversations.map((conversation) => (
                  <SidebarMenuItem key={conversation.id}>
                    <div className="group/item flex w-full items-center gap-1">
                      <SidebarMenuButton
                        className="flex-1 font-sans"
                        disabled={newChatDisabled}
                        onClick={() => handleConversationClick(conversation.id)}
                        isActive={activeId === conversation.id}
                      >
                        <span
                          className={newChatDisabled ? "text-muted-foreground" : ""}
                        >
                          {conversation.title}
                        </span>
                      </SidebarMenuButton>
                      {!newChatDisabled && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 opacity-0 transition-opacity group-hover/item:opacity-100"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive hover:text-destructive"
                              onClick={(e) => handleDeleteClick(conversation.id, e)}
                            >
                              <Trash2 className="mr-2 size-4 text-destructive" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>
          ))
        )}
      </SidebarContent>
      
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="py-4 px-2 text-start ltr:-translate-x-1/2 rtl:translate-x-1/2 shadow-long flex flex-col focus:outline-hidden max-w-md overflow-hidden rounded-2xl">
          <AlertDialogHeader className="min-h-header-height flex justify-between p-0 ps-4 select-none">
            <AlertDialogTitle className="font-sans">Delete Chat</AlertDialogTitle>
            <AlertDialogDescription>
            This will delete {``}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-2xl" disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-white rounded-2xl"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sidebar>
  );
}
