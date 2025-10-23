"use client";
import { FullChatApp } from "@/components/chat-ui/full-chat";
import NewChatApp from "@/components/chat-ui/new-chat";
import { ChatMessage, ToolEvent } from "@/lib/chat-types";
import { useState } from "react";

type ChatMode = "new" | "full";

export default function Home() {
  const [mode, setMode] = useState<ChatMode>("new");
  const [initialMessages, setInitialMessages] = useState<ChatMessage[]>([]);
  const [initialToolEvents, setInitialToolEvents] = useState<ToolEvent[]>([]);

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
        />
      )}
    </>
  );
}
