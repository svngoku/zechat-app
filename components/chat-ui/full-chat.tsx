"use client"

import {
  ChatContainerContent,
  ChatContainerRoot,
} from "@/components/ui/chat-container"
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
} from "@/components/ui/message"
import {
  PromptInput,
  PromptInputAction,
  PromptInputActions,
  PromptInputTextarea,
} from "@/components/ui/prompt-input"
import { ScrollButton } from "@/components/ui/scroll-button"
import { Button } from "@/components/ui/button"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { ChatSidebar, type ConversationItem } from "@/components/chat-ui/chat-sidebar"
import { cn } from "@/lib/utils"
import {
  ArrowUp,
  Copy,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  ThumbsDown,
  ThumbsUp,
  Trash,
} from "lucide-react"
import { useRef, useState, useEffect } from "react"
import {
  chatApiResponseSchema,
  mapApiResponseToChatUpserts,
  type ChatMessage,
  type ToolEvent,
  correlateToolCallsWithResults,
} from "@/lib/chat-types"
import { 
  saveConversation, getConversationsForSidebar, 
  getConversation 
} from "@/lib/chat-storage"

interface ChatContentProps {
  conversationId?: string;
  initialMessages?: ChatMessage[];
  initialToolEvents?: ToolEvent[];
  onConversationUpdate?: () => void;
  conversationTitle?: string;
}

function ChatContent({ conversationId, initialMessages = [], initialToolEvents = [], onConversationUpdate, conversationTitle }: ChatContentProps) {
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [toolEvents, setToolEvents] = useState<ToolEvent[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [title, setTitle] = useState(conversationTitle || "New Chat")

  // Seed initial messages and tool events
  useEffect(() => {
    if (initialMessages.length > 0) {
      setMessages(initialMessages);
    }
    if (initialToolEvents.length > 0) {
      setToolEvents(initialToolEvents);
    }
  }, [initialMessages, initialToolEvents]);

  // Update title when conversation changes
  useEffect(() => {
    const loadTitle = async () => {
      if (conversationId) {
        const conversation = await getConversation(conversationId);
        if (conversation) {
          setTitle(conversation.title);
        }
      } else {
        setTitle("New Chat");
      }
    };
    loadTitle();
  }, [conversationId]);

  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: input.trim(),
      createdAt: Date.now(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to get response")
      }

      const data = await response.json()
      const validated = chatApiResponseSchema.parse(data)

      if (process.env.NODE_ENV !== "production") {
        console.debug("API Response:", {
          text: validated.text,
          toolCallsCount: validated.toolCalls.length,
          toolResultsCount: validated.toolResults.length,
          stepsCount: validated.stepsCount,
        })
      }

      const { assistantMessage, toolEvents: newToolEvents } =
        mapApiResponseToChatUpserts(validated)

      if (assistantMessage) {
        setMessages((prev) => [...prev, assistantMessage])
      }

      if (newToolEvents.length > 0) {
        setToolEvents((prev) => [...prev, ...newToolEvents])
      }

      // Save conversation to localStorage
      if (conversationId) {
        const updatedMessages = assistantMessage 
          ? [...messages, userMessage, assistantMessage]
          : [...messages, userMessage];
        const updatedToolEvents = newToolEvents.length > 0
          ? [...toolEvents, ...newToolEvents]
          : toolEvents;
        
        await saveConversation(conversationId, updatedMessages, updatedToolEvents);
        onConversationUpdate?.();
      }
    } catch (error) {
      console.error("Chat error:", error)
      // TODO: Add error message to UI
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="flex h-screen flex-col overflow-hidden">
      <header className="bg-background z-10 flex h-16 w-full shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <div className="text-foreground font-sans text-base font-medium truncate">{title}</div>
      </header>

      <div ref={chatContainerRef} className="relative flex-1 overflow-y-auto">
        <ChatContainerRoot className="h-full">
          <ChatContainerContent className="space-y-0 px-5 py-12">
            {messages.map((message: ChatMessage, index: number) => {
              const isAssistant = message.role === "assistant"
              const isLastMessage = index === messages.length - 1
              
              // Get tool events related to this message (all tool events between this and previous message)
              const messageToolEvents = isAssistant && isLastMessage 
                ? toolEvents.filter((_, idx) => idx >= toolEvents.length - (toolEvents.length > 0 ? Math.min(10, toolEvents.length) : 0))
                : []

              return (
                <>
                  <div key={message.id}>
                    <Message
                      className={cn(
                        "mx-auto flex w-full max-w-3xl flex-col gap-2 px-6",
                        isAssistant ? "items-start" : "items-end"
                      )}
                    >
                      {isAssistant ? (
                        <div className="group flex w-full flex-col gap-2">
                          {message.content && (
                            <MessageContent
                              className="text-foreground prose flex-1 rounded-lg bg-transparent p-0 font-sans"
                              markdown
                            >
                              {message.content}
                            </MessageContent>
                          )}
                          
                          {/* Render tool events */}
                          {messageToolEvents.length > 0 && (
                            <div className="space-y-2 mt-2">
                              {(() => {
                                const toolCalls = messageToolEvents.filter(e => e.type === "tool-call")
                                const toolResults = messageToolEvents.filter(e => e.type === "tool-result")
                                const correlated = correlateToolCallsWithResults(
                                  toolCalls as Parameters<typeof correlateToolCallsWithResults>[0],
                                  toolResults as Parameters<typeof correlateToolCallsWithResults>[1]
                                )
                                
                                return correlated
                                  .filter(({ result }) => {
                                    if (!result) return false;
                                    const resultData = result.result as { 
                                      success?: boolean;
                                      count?: number;
                                      results?: Array<{
                                        id: string;
                                        path: string;
                                        content: string;
                                        score?: number;
                                      }>;
                                    } | undefined;
                                    return resultData !== null && resultData !== undefined;
                                  })
                                  .map(({ call, result }) => {
                                    const resultData = result!.result as { 
                                      success?: boolean;
                                      count?: number;
                                      results?: Array<{
                                        id: string;
                                        path: string;
                                        content: string;
                                        score?: number;
                                      }>;
                                    } | undefined;
                                    
                                    return (
                                      <div
                                        key={call.toolCallId}
                                        className="border-muted bg-muted/30 rounded-lg border p-3"
                                      >
                                        <div className="text-muted-foreground mb-2 flex items-center gap-2 text-sm font-medium font-sans">
                                          <Search className="size-4" />
                                          {call.toolName === "searchSnippets" ? "Search Snippets" : "Search Documents"}
                                          {resultData?.count && ` (${resultData.count} results)`}
                                        </div>
                                        
                                        {resultData?.success && Array.isArray(resultData.results) && resultData.results.length > 0 && (
                                          <div className="space-y-2">
                                            {resultData.results.slice(0, 3).map((r) => (
                                              <div
                                                key={r.id}
                                                className="border-border bg-background rounded border p-2 text-sm"
                                              >
                                                <div className="text-muted-foreground mb-1 text-xs font-mono">
                                                  {r.path} {r.score && `(Score: ${r.score.toFixed(3)})`}
                                                </div>
                                                <div className="line-clamp-2 font-sans">
                                                  {r.content}
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                        
                                        {(!resultData?.success || !resultData.results?.length) && (
                                          <div className="text-muted-foreground text-sm font-sans">
                                            No results found
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })
                              })()}
                            </div>
                          )}
                          
                          <MessageActions
                            className={cn(
                              "-ml-2.5 flex gap-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100",
                              isLastMessage && "opacity-100"
                            )}
                          >
                            <MessageAction tooltip="Copy" delayDuration={100}>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="rounded-full"
                              >
                                <Copy />
                              </Button>
                            </MessageAction>
                            <MessageAction tooltip="Upvote" delayDuration={100}>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="rounded-full"
                              >
                                <ThumbsUp />
                              </Button>
                            </MessageAction>
                            <MessageAction tooltip="Downvote" delayDuration={100}>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="rounded-full"
                              >
                                <ThumbsDown />
                              </Button>
                            </MessageAction>
                          </MessageActions>
                        </div>
                      ) : (
                        <div className="group flex flex-col items-end gap-1">
                          <MessageContent className="bg-muted text-primary max-w-[85%] rounded-3xl px-5 py-2.5 sm:max-w-[75%] font-sans">
                            {message.content}
                          </MessageContent>
                          <MessageActions
                            className={cn(
                              "flex gap-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
                            )}
                          >
                            <MessageAction tooltip="Edit" delayDuration={100}>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="rounded-full"
                              >
                                <Pencil />
                              </Button>
                            </MessageAction>
                            <MessageAction tooltip="Delete" delayDuration={100}>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="rounded-full"
                              >
                                <Trash />
                              </Button>
                            </MessageAction>
                            <MessageAction tooltip="Copy" delayDuration={100}>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="rounded-full"
                              >
                                <Copy />
                              </Button>
                            </MessageAction>
                          </MessageActions>
                        </div>
                      )}
                    </Message>
                  </div>
                </>
              )
            })}
          </ChatContainerContent>
          <div className="absolute bottom-4 left-1/2 flex w-full max-w-3xl -translate-x-1/2 justify-end px-5">
            <ScrollButton className="shadow-sm" />
          </div>
        </ChatContainerRoot>
      </div>

      <div className="bg-background z-10 shrink-0 px-3 pb-3 md:px-5 md:pb-5">
        <div className="mx-auto max-w-3xl">
          <PromptInput
            isLoading={isLoading}
            value={input}
            onValueChange={setInput}
            onSubmit={handleSubmit}
            className="border-input bg-popover relative z-10 w-full rounded-3xl border p-0 pt-1 shadow-xs"
          >
            <div className="flex flex-col">
              <PromptInputTextarea
                placeholder="Ask anything"
                className="min-h-[44px] pt-3 pl-4 text-base leading-[1.3] sm:text-base md:text-base font-sans"
              />

              <PromptInputActions className="mt-5 flex w-full items-center justify-between gap-2 px-3 pb-3">
                <div className="flex items-center gap-2">
                  <PromptInputAction tooltip="Add a new action">
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-9 rounded-full"
                    >
                      <Plus size={18} />
                    </Button>
                  </PromptInputAction>

                  <PromptInputAction tooltip="More actions">
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-9 rounded-full"
                    >
                      <MoreHorizontal size={18} />
                    </Button>
                  </PromptInputAction>
                </div>
                <div className="flex items-center gap-2">
                  {/* <PromptInputAction tooltip="Voice input">
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-9 rounded-full"
                    >
                      <Mic size={18} />
                    </Button>
                  </PromptInputAction> */}

                  <Button
                    size="icon"
                    disabled={!input.trim() || isLoading}
                    onClick={handleSubmit}
                    className="size-9 rounded-full"
                  >
                    {!isLoading ? (
                      <ArrowUp size={18} />
                    ) : (
                      <span className="size-3 rounded-xs bg-white" />
                    )}
                  </Button>
                </div>
              </PromptInputActions>
            </div>
          </PromptInput>
        </div>
      </div>
    </main>
  )
}

interface FullChatAppProps {
  conversationId?: string;
  initialMessages?: ChatMessage[];
  initialToolEvents?: ToolEvent[];
  onNewChat?: () => void;
  conversations?: ConversationItem[];
}

function FullChatApp({ 
  conversationId,
  initialMessages = [], 
  initialToolEvents = [], 
  onNewChat,
  conversations = []
}: FullChatAppProps) {
  const [sidebarConversations, setSidebarConversations] = useState<ConversationItem[]>(conversations);
  const [conversationTitle, setConversationTitle] = useState<string>("New Chat");

  const handleConversationUpdate = async () => {
    const convs = await getConversationsForSidebar();
    setSidebarConversations(convs);
  };

  useEffect(() => {
    const loadData = async () => {
      const convs = await getConversationsForSidebar();
      setSidebarConversations(convs);
      
      // Load conversation title
      if (conversationId) {
        const conversation = await getConversation(conversationId);
        if (conversation) {
          setConversationTitle(conversation.title);
        }
      }
    };
    loadData();
  }, [conversationId]);

  return (
    <SidebarProvider>
      <ChatSidebar 
        onNewChat={onNewChat} 
        conversations={sidebarConversations}
        currentConversationId={conversationId}
        onConversationDeleted={handleConversationUpdate}
      />
      <SidebarInset>
        <ChatContent 
          conversationId={conversationId}
          initialMessages={initialMessages}
          initialToolEvents={initialToolEvents}
          onConversationUpdate={handleConversationUpdate}
          conversationTitle={conversationTitle}
        />
      </SidebarInset>
    </SidebarProvider>
  )
}

export { FullChatApp, type ConversationItem }
