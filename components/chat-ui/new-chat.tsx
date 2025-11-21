"use client";

import type React from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { PromptSuggestion } from "@/components/ui/prompt-suggestion"
import { cn } from "@/lib/utils";
import {
  Mic,
  Paperclip,
  Plus,
  Sparkles,
  AlertCircle,
  Loader2,
  ArrowUp,
  LibraryBig,
  Search,
  FolderIcon,
} from "lucide-react";
import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  chatApiResponseSchema,
  mapApiResponseToChatUpserts,
  type ChatMessage,
  type ToolEvent,
} from "@/lib/chat-types";
import { createConversationId, saveConversation, getConversationsForSidebar } from "@/lib/chat-storage";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { ChatSidebar, type ConversationItem } from "@/components/chat-ui/chat-sidebar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchCollections } from "@/lib/collection-client";


const suggestionGroups = [
  {
    label: "History",
    highlight: "Discover",
    items: [
      "Who was Francisco de Almeida and what happened to him along Africa's southernmost coast in 1510?",
      "Who were the primary developers of Cordova in the 10th century according to the text?",
      "What significant event in 1492 is described as ending Spain's greatness, and what followed in Spanish history?",
    ],
  },
  {
    label: "Language & Culture",
    highlight: "Explain",
    items: [
      "What does the Akan proverb “Okoto nnwo anomaa” mean and how is it used in the context of genetics?",
    ],
  },
];

function NewChatSidebar() {
  const [conversations, setConversations] = useState<ConversationItem[]>([]);

  const loadConversations = async () => {
    const convs = await getConversationsForSidebar();
    setConversations(convs);
  };

  useEffect(() => {
    loadConversations();
  }, []);

  return (
    <ChatSidebar 
      conversations={conversations}
      newChatDisabled={false}
      onConversationDeleted={loadConversations}
    />
  );
}

function NewChatContent() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeCategory, setActiveCategory] = useState("");
  const [collections, setCollections] = useState<string[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<string | undefined>(undefined);

  useEffect(() => {
    const loadCollections = async () => {
      try {
        const colls = await fetchCollections();
        setCollections(colls);
        if (colls.length > 0) {
          setSelectedCollection(colls[0]);
        }
      } catch (error) {
        console.error("Failed to load collections:", error);
      }
    };
    loadCollections();
  }, []);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!message.trim() || isSubmitting) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: message.trim(),
      createdAt: Date.now(),
    };

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: userMessage.role, content: userMessage.content }],
          collection: selectedCollection,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const validated = chatApiResponseSchema.parse(data);

      const { assistantMessage, toolEvents } =
        mapApiResponseToChatUpserts(validated);

      const messages: ChatMessage[] = [userMessage];
      if (assistantMessage) {
        messages.push(assistantMessage);
      }

      // Save conversation and redirect
      const conversationId = createConversationId();
      await saveConversation(conversationId, messages, toolEvents);
      router.push(`/chat/${conversationId}`);
    } catch (err) {
      console.error("Chat submission error:", err);
      setError(
        err instanceof Error ? err.message : "Failed to send message. Please try again."
      );
      setIsSubmitting(false);
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }

    setIsExpanded(e.target.value.length > 100 || e.target.value.includes("\n"));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit(e as React.FormEvent);
    }
  };

  const activeCategoryData = suggestionGroups.find(
    (group) => group.label === activeCategory
  )

  // Determine which suggestions to show
  const showCategorySuggestions = activeCategory !== ""

  return (
    <main className="flex h-screen flex-col overflow-hidden">
      <div className="flex-1 flex items-center justify-center overflow-y-auto mx-full">
        <div className="w-full max-w-3xl px-3 mt-12">
          <h1 className="mb-7 mx-auto max-w-2xl text-center text-2xl font-semibold leading-9 text-foreground px-1 text-pretty whitespace-pre-wrap font-sans">
            What do we need to search today?
          </h1>
          {error && (
            <div className="mb-4 mx-auto max-w-2xl rounded-lg bg-destructive/10 border border-destructive/20 p-3 flex items-start gap-2">
              <AlertCircle className="size-4 text-destructive mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
          <form onSubmit={handleSubmit} className="group/composer w-full">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="sr-only"
              onChange={() => {}}
            />

            <div
              className={cn(
                "w-full max-w-2xl mx-auto bg-transparent dark:bg-muted/50 cursor-text overflow-clip bg-clip-padding p-2.5 shadow-lg border border-border transition-all duration-200",
                {
                  "rounded-3xl grid grid-cols-1 grid-rows-[auto_1fr_auto]":
                    isExpanded,
                  "rounded-[28px] grid grid-cols-[auto_1fr_auto] grid-rows-[auto_1fr_auto]":
                    !isExpanded,
                }
              )}
              style={{
                gridTemplateAreas: isExpanded
                  ? "'header' 'primary' 'footer'"
                  : "'header header header' 'leading primary trailing' '. footer .'",
              }}
            >
              <div
                className={cn(
                  "flex min-h-14 items-center overflow-x-hidden px-1.5",
                  {
                    "px-2 py-1 mb-0": isExpanded,
                    "-my-2.5": !isExpanded,
                  }
                )}
                style={{ gridArea: "primary" }}
              >
                <div className="flex-1 overflow-auto max-h-52">
                  <Textarea
                    ref={textareaRef}
                    value={message}
                    onChange={handleTextareaChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask anything"
                    className="min-h-0 resize-none rounded-none border-0 p-0 text-base placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 scrollbar-thin dark:bg-transparent"
                    rows={1}
                  />
                </div>
              </div>

              <div
                className={cn("flex items-center gap-1", { hidden: isExpanded })}
                style={{ gridArea: "leading" }}
              >
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-full hover:bg-accent outline-none ring-0"
                    >
                      <Plus className="size-6 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent
                    align="start"
                    className="max-w-xs rounded-2xl p-1.5"
                  >
                    <DropdownMenuGroup className="space-y-1">
                      <DropdownMenuItem
                        className="rounded-[calc(1rem-6px)]"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Paperclip size={20} className="opacity-60" />
                        Add photos & files
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="rounded-[calc(1rem-6px)]"
                        onClick={() => {}}
                      >
                        <div className="flex items-center gap-2">
                          <Sparkles size={20} className="opacity-60" />
                          Agent mode
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="rounded-[calc(1rem-6px)]"
                        onClick={() => {}}
                      >
                        <Search size={20} className="opacity-60" />
                        Deep Research
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
                
                {collections.length > 0 && (
                  <Select value={selectedCollection} onValueChange={setSelectedCollection}>
                    <SelectTrigger className="h-9 w-auto min-w-[140px] border-0 bg-transparent hover:bg-accent shadow-none px-2 gap-1">
                      <FolderIcon className="size-4 text-muted-foreground shrink-0" />
                      <SelectValue placeholder="Collection" />
                    </SelectTrigger>
                    <SelectContent>
                      {collections.map((collection) => (
                        <SelectItem key={collection} value={collection}>
                          {collection}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div
                className="flex items-center gap-2"
                style={{ gridArea: isExpanded ? "footer" : "trailing" }}
              >
                <div className="ms-auto flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full hover:bg-accent"
                  >
                    <Mic className="size-5 text-muted-foreground" />
                  </Button>
                  {message.trim() && (
                    <Button
                      type="submit"
                      size="icon"
                      className="size-9 rounded-full bg-[#5154ff] hover:bg-[#4594ff] cursor-pointer"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <Loader2 className="size-5 animate-spin" />
                      ) : (
                        <ArrowUp size={18} />
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
            {/* Suggestion Section */}
            <div className="mt-6 mx-8 flex w-full font-sans">
              <div className="relative flex w-full flex-col items-center justify-center space-y-2">
                <div className="absolute top-0 left-0 h-[70px] w-full">
                  {activeCategory && suggestionGroups.find((g) => g.label === activeCategory) ? (
                    <div className="flex w-full flex-col space-y-1">
                      {suggestionGroups
                        .find((g) => g.label === activeCategory)
                        ?.items.map((suggestion) => (
                          <PromptSuggestion
                            key={suggestion}
                            className="font-sans"
                            highlight={
                              suggestionGroups.find((g) => g.label === activeCategory)?.highlight
                            }
                            onClick={() => {
                              setMessage(suggestion);
                              setIsExpanded(true);
                              setActiveCategory("");
                              if (textareaRef.current) {
                                textareaRef.current.focus();
                              }
                            }}
                          >
                            {suggestion}
                          </PromptSuggestion>
                        ))}
                    </div>
                  ) : (
                    <div className="relative flex w-full flex-wrap items-stretch justify-start gap-2">
                      {suggestionGroups.map((group) => (
                        <PromptSuggestion
                          key={group.label}
                          onClick={() => setActiveCategory(group.label)}
                          className="capitalize"
                        >
                          <LibraryBig className="mr-2 h-4 w-4" />
                          {group.label}
                        </PromptSuggestion>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
      <div className="group/thread-bottom-container relative isolate z-10 w-full basis-auto has-data-has-thread-error:pt-2 has-data-has-thread-error:[box-shadow:var(--sharp-edge-bottom-shadow)] md:border-transparent md:pt-0 dark:border-white/20 md:dark:border-transparent single-line min-h-0 mb-4 sm:grow flex flex-col">

      </div>
    </main>
  );
}

export default function NewChatApp() {
  return (
    <SidebarProvider>
      <NewChatSidebar />
      <SidebarInset>
        <NewChatContent />
      </SidebarInset>
    </SidebarProvider>
  );
}

