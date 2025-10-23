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
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import {
  ArrowUp,
  Copy,
  Mic,
  MoreHorizontal,
  Pencil,
  Plus,
  PlusIcon,
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

// Types for conversation history
type ConversationItem = {
  id: string
  title: string
  lastMessage: string
  timestamp: number
}

type ConversationGroup = {
  period: string
  conversations: ConversationItem[]
}

// Helper to group conversations by time period
function groupConversationsByPeriod(conversations: ConversationItem[]): ConversationGroup[] {
  const now = Date.now()
  const dayMs = 24 * 60 * 60 * 1000
  
  const today: ConversationItem[] = []
  const yesterday: ConversationItem[] = []
  const lastWeek: ConversationItem[] = []
  const lastMonth: ConversationItem[] = []
  
  conversations.forEach((conv) => {
    const diff = now - conv.timestamp
    if (diff < dayMs) {
      today.push(conv)
    } else if (diff < 2 * dayMs) {
      yesterday.push(conv)
    } else if (diff < 7 * dayMs) {
      lastWeek.push(conv)
    } else if (diff < 30 * dayMs) {
      lastMonth.push(conv)
    }
  })
  
  const groups: ConversationGroup[] = []
  if (today.length > 0) groups.push({ period: "Today", conversations: today })
  if (yesterday.length > 0) groups.push({ period: "Yesterday", conversations: yesterday })
  if (lastWeek.length > 0) groups.push({ period: "Last 7 days", conversations: lastWeek })
  if (lastMonth.length > 0) groups.push({ period: "Last month", conversations: lastMonth })
  
  return groups
}


interface ChatSidebarProps {
  onNewChat?: () => void
  conversations?: ConversationItem[]
}

function ChatSidebar({ onNewChat, conversations = [] }: ChatSidebarProps) {
  const conversationGroups = groupConversationsByPeriod(conversations)
  
  return (
    <Sidebar>
      <SidebarHeader className="flex flex-row items-center justify-between gap-2 px-2 py-4">
        <div className="flex flex-row items-center gap-2 px-2 mx-4 rounded-lg py-2">
            <img src="/svgs_collection/zeroentropy-dark.svg" className="h-auto" alt="logo" />
        </div>
        <Button variant="ghost" className="size-8">
          <Search className="size-4" />
        </Button>
      </SidebarHeader>
      <SidebarContent className="pt-4">
        <div className="px-4">
          <Button
            variant="outline"
            className="mb-4 flex w-full items-center gap-2"
            onClick={onNewChat}
          >
            <PlusIcon className="size-4" />
            <span>New Chat</span>
          </Button>
        </div>
        {conversationGroups.length === 0 ? (
          <div className="px-4 text-sm text-muted-foreground">
            No conversation history yet
          </div>
        ) : (
          conversationGroups.map((group) => (
            <SidebarGroup key={group.period}>
              <SidebarGroupLabel>{group.period}</SidebarGroupLabel>
              <SidebarMenu>
                {group.conversations.map((conversation) => (
                  <SidebarMenuButton key={conversation.id}>
                    <span>{conversation.title}</span>
                  </SidebarMenuButton>
                ))}
              </SidebarMenu>
            </SidebarGroup>
          ))
        )}
      </SidebarContent>
    </Sidebar>
  )
}

interface ChatContentProps {
  initialMessages?: ChatMessage[];
  initialToolEvents?: ToolEvent[];
}

function ChatContent({ initialMessages = [], initialToolEvents = [] }: ChatContentProps) {
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [toolEvents, setToolEvents] = useState<ToolEvent[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  // Seed initial messages and tool events
  useEffect(() => {
    if (initialMessages.length > 0) {
      setMessages(initialMessages);
    }
    if (initialToolEvents.length > 0) {
      setToolEvents(initialToolEvents);
    }
  }, [initialMessages, initialToolEvents]);

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
        <div className="text-foreground">Project roadmap discussion</div>
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
                <Message
                  key={message.id}
                  className={cn(
                    "mx-auto flex w-full max-w-3xl flex-col gap-2 px-6",
                    isAssistant ? "items-start" : "items-end"
                  )}
                >
                  {isAssistant ? (
                    <div className="group flex w-full flex-col gap-2">
                      {message.content && (
                        <MessageContent
                          className="text-foreground prose flex-1 rounded-lg bg-transparent p-0 "
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
                            
                            return correlated.map(({ call, result }) => {
                              if (!result) return null
                              
                              const resultData = result.result as { 
                                success?: boolean;
                                count?: number;
                                results?: Array<{
                                  id: string;
                                  path: string;
                                  content: string;
                                  score?: number;
                                }>;
                              } | undefined
                              
                              if (!resultData) return null
                              
                              return (
                                <div
                                  key={call.toolCallId}
                                  className="border-muted bg-muted/30 rounded-lg border p-3"
                                >
                                  <div className="text-muted-foreground mb-2 flex items-center gap-2 text-sm font-medium">
                                    <Search className="size-4" />
                                    {call.toolName === "searchSnippets" ? "Search Snippets" : "Search Documents"}
                                    {resultData.count && ` (${resultData.count} results)`}
                                  </div>
                                  
                                  {resultData.success && Array.isArray(resultData.results) && resultData.results.length > 0 && (
                                    <div className="space-y-2">
                                      {resultData.results.slice(0, 3).map((r) => (
                                        <div
                                          key={r.id}
                                          className="border-border bg-background rounded border p-2 text-sm"
                                        >
                                          <div className="text-muted-foreground mb-1 text-xs">
                                            {r.path} {r.score && `(Score: ${r.score.toFixed(3)})`}
                                          </div>
                                          <div className="line-clamp-2">
                                            {r.content}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  
                                  {(!resultData.success || !resultData.results?.length) && (
                                    <div className="text-muted-foreground text-sm">
                                      No results found
                                    </div>
                                  )}
                                </div>
                              )
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
                      <MessageContent className="bg-muted text-primary max-w-[85%] rounded-3xl px-5 py-2.5 sm:max-w-[75%]">
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
                className="min-h-[44px] pt-3 pl-4 text-base leading-[1.3] sm:text-base md:text-base"
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
                  <PromptInputAction tooltip="Voice input">
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-9 rounded-full"
                    >
                      <Mic size={18} />
                    </Button>
                  </PromptInputAction>

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
  initialMessages?: ChatMessage[]
  initialToolEvents?: ToolEvent[]
  onNewChat?: () => void
  conversations?: ConversationItem[]
}

function FullChatApp({ 
  initialMessages = [], 
  initialToolEvents = [], 
  onNewChat,
  conversations = []
}: FullChatAppProps) {
  return (
    <SidebarProvider>
      <ChatSidebar onNewChat={onNewChat} conversations={conversations} />
      <SidebarInset>
        <ChatContent 
          initialMessages={initialMessages}
          initialToolEvents={initialToolEvents}
        />
      </SidebarInset>
    </SidebarProvider>
  )
}

export { FullChatApp, type ConversationItem, type ConversationGroup }
