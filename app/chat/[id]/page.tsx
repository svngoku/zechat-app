"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FullChatApp } from "@/components/chat-ui/full-chat";
import { getConversation, getConversationsForSidebar } from "@/lib/chat-storage";
import { ChatMessage, ToolEvent } from "@/lib/chat-types";
import { ConversationItem } from "@/components/chat-ui/chat-sidebar";

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [initialMessages, setInitialMessages] = useState<ChatMessage[]>([]);
  const [initialToolEvents, setInitialToolEvents] = useState<ToolEvent[]>([]);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const loadConversation = async () => {
      const conversation = await getConversation(id);

      if (!conversation) {
        setNotFound(true);
        setIsLoading(false);
        return;
      }

      setInitialMessages(conversation.messages);
      setInitialToolEvents(conversation.toolEvents);
      setConversations(await getConversationsForSidebar());
      setIsLoading(false);
    };

    loadConversation();
  }, [id]);

  const handleNewChat = () => {
    router.push("/");
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="size-12 animate-spin rounded-full border-4 border-muted border-t-primary" />
          <p className="text-muted-foreground font-sans text-sm">Loading conversation...</p>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <h2 className="font-display text-2xl font-semibold">Conversation not found</h2>
          <p className="text-muted-foreground font-sans text-sm">
            This conversation doesn&apos;t exist or has been deleted.
          </p>
          <button
            onClick={() => router.push("/")}
            className="mt-4 rounded-lg bg-primary px-4 py-2 font-sans text-primary-foreground hover:bg-primary/90"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <FullChatApp
      conversationId={id}
      initialMessages={initialMessages}
      initialToolEvents={initialToolEvents}
      onNewChat={handleNewChat}
      conversations={conversations}
    />
  );
}
