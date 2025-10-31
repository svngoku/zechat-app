"use client";

import { ChatMessage, ToolEvent } from "@/lib/chat-types";
import { ConversationItem } from "@/components/chat-ui/chat-sidebar";

export interface StoredConversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  toolEvents: ToolEvent[];
  createdAt: number;
  updatedAt: number;
}

export async function getAllConversations(): Promise<StoredConversation[]> {
  try {
    const response = await fetch("/api/conversations");
    if (!response.ok) throw new Error("Failed to fetch conversations");
    return await response.json();
  } catch (error) {
    console.error("Error loading conversations:", error);
    return [];
  }
}

export async function getConversation(id: string): Promise<StoredConversation | null> {
  try {
    const response = await fetch(`/api/conversations?id=${id}`);
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error("Failed to fetch conversation");
    }
    return await response.json();
  } catch (error) {
    console.error("Error loading conversation:", error);
    return null;
  }
}

export async function saveConversation(
  id: string,
  messages: ChatMessage[],
  toolEvents: ToolEvent[],
  existingTitle?: string
): Promise<StoredConversation> {
  const now = Date.now();
  let createdAt = now;

  if (!existingTitle) {
    const existing = await getConversation(id);
    if (existing) {
      createdAt = existing.createdAt;
    }
  }

  const title = existingTitle || generateTitle(messages);

  const conversation: StoredConversation = {
    id,
    title,
    messages,
    toolEvents,
    createdAt,
    updatedAt: now,
  };

  try {
    const response = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(conversation),
    });

    if (!response.ok) throw new Error("Failed to save conversation");
    
    return conversation;
  } catch (error) {
    console.error("Error saving conversation:", error);
    throw error;
  }
}

export async function deleteConversation(id: string): Promise<void> {
  try {
    const response = await fetch(`/api/conversations?id=${id}`, {
      method: "DELETE",
    });

    if (!response.ok) throw new Error("Failed to delete conversation");
  } catch (error) {
    console.error("Error deleting conversation:", error);
    throw error;
  }
}

export async function updateConversationTitle(id: string, title: string): Promise<void> {
  try {
    const response = await fetch("/api/conversations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, title }),
    });

    if (!response.ok) throw new Error("Failed to update conversation title");
  } catch (error) {
    console.error("Error updating conversation title:", error);
    throw error;
  }
}

export async function getConversationsForSidebar(): Promise<ConversationItem[]> {
  const conversations = await getAllConversations();
  return conversations.map((c) => ({
    id: c.id,
    title: c.title,
    lastMessage: c.messages[c.messages.length - 1]?.content || "",
    timestamp: c.updatedAt,
  }));
}

function generateTitle(messages: ChatMessage[]): string {
  const firstUserMessage = messages.find((m) => m.role === "user");
  if (!firstUserMessage) return "New conversation";

  const content = firstUserMessage.content;
  const maxLength = 50;

  if (content.length <= maxLength) return content;

  return content.slice(0, maxLength).trim() + "...";
}

export function createConversationId(): string {
  return `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export async function clearAllConversations(): Promise<void> {
  const conversations = await getAllConversations();
  await Promise.all(conversations.map((c) => deleteConversation(c.id)));
}
