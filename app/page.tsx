"use client";
import { FullChatApp, type ConversationItem } from "@/components/chat-ui/full-chat";
import NewChatApp from "@/components/chat-ui/new-chat";
import { ChatMessage, ToolEvent } from "@/lib/chat-types";
import { useState } from "react";

type ChatMode = "new" | "full";

export default function Home() {
  const [mode, setMode] = useState<ChatMode>("new");
  const [initialMessages, setInitialMessages] = useState<ChatMessage[]>([]);
  const [initialToolEvents, setInitialToolEvents] = useState<ToolEvent[]>([]);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);

  const handleStartChat = ({
    messages,
    toolEvents,
  }: {
    messages: ChatMessage[];
    toolEvents: ToolEvent[];
  }) => {
    setInitialMessages(messages);
    setInitialToolEvents(toolEvents);
    setMode("full");
    
    // Create a conversation entry from the first user message
    if (messages.length > 0) {
      const firstUserMessage = messages.find(m => m.role === "user");
      if (firstUserMessage) {
        const newConversation: ConversationItem = {
          id: `conv-${Date.now()}`,
          title: firstUserMessage.content.slice(0, 50) + (firstUserMessage.content.length > 50 ? "..." : ""),
          lastMessage: firstUserMessage.content,
          timestamp: Date.now(),
        };
        setConversations(prev => [newConversation, ...prev]);
      }
    }
  };

  const handleNewChat = () => {
    setInitialMessages([]);
    setInitialToolEvents([]);
    setMode("new");
  };

  return (
    <>
      {mode === "new" ? (
        <NewChatApp onStartChat={handleStartChat} />
      ) : (
        <FullChatApp
          initialMessages={initialMessages}
          initialToolEvents={initialToolEvents}
          onNewChat={handleNewChat}
          conversations={conversations}
        />
      )}
    </>
  );
}
