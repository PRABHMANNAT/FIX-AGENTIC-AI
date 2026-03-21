"use client";

import { ArrowRight, Loader2, Plus, Zap } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { DEMO_USER_ID, demoConversations, demoMessagesByConversation } from "@/lib/demo-data";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import { cn, createId, formatTime, formatTimestamp, groupConversationsByDay } from "@/lib/utils";
import type { AgentMessage, Conversation } from "@/types";

export default function AgentPage() {
  const [supabase] = useState(() => createBrowserSupabaseClient());
  const [conversations, setConversations] = useState<Conversation[]>(demoConversations);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(
    demoConversations[0]?.id ?? null,
  );
  const [messages, setMessages] = useState<AgentMessage[]>(
    demoMessagesByConversation[demoConversations[0]?.id] ?? [],
  );
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const groupedConversations = useMemo(
    () => groupConversationsByDay(conversations),
    [conversations],
  );

  const loadConversations = async (preferredConversationId?: string | null) => {
    setLoadingConversations(true);

    if (!supabase) {
      setConversations(demoConversations);
      setSelectedConversationId(
        preferredConversationId !== undefined
          ? preferredConversationId
          : demoConversations[0]?.id ?? null,
      );
      setLoadingConversations(false);
      return;
    }

    const { data } = await supabase
      .from("conversations")
      .select("*")
      .eq("agent_type", "coworker")
      .order("updated_at", { ascending: false });

    const nextConversations = data?.length ? data : demoConversations;
    const nextSelectedConversationId =
      preferredConversationId !== undefined
        ? preferredConversationId
        : selectedConversationId ?? nextConversations[0]?.id ?? null;

    setConversations(nextConversations);
    setSelectedConversationId(nextSelectedConversationId);
    setLoadingConversations(false);
  };

  useEffect(() => {
    void loadConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  useEffect(() => {
    let active = true;

    const loadMessages = async () => {
      setLoadingMessages(true);

      if (!selectedConversationId) {
        setMessages([]);
        setLoadingMessages(false);
        return;
      }

      if (!supabase) {
        setMessages(demoMessagesByConversation[selectedConversationId] ?? []);
        setLoadingMessages(false);
        return;
      }

      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", selectedConversationId)
        .order("created_at", { ascending: true });

      if (!active) {
        return;
      }

      setMessages(
        data?.map((message) => ({
          id: message.id,
          role: message.role,
          content: message.content,
          created_at: message.created_at,
          metadata:
            message.metadata && typeof message.metadata === "object"
              ? (message.metadata as Record<string, string>)
              : null,
        })) ?? [],
      );
      setLoadingMessages(false);
    };

    void loadMessages();

    return () => {
      active = false;
    };
  }, [selectedConversationId, supabase]);

  useEffect(() => {
    threadRef.current?.scrollTo({
      top: threadRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  useEffect(() => {
    if (!textareaRef.current) {
      return;
    }

    textareaRef.current.style.height = "0px";
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 136)}px`;
  }, [input]);

  const selectedConversation = conversations.find(
    (conversation) => conversation.id === selectedConversationId,
  );

  const handleSubmit = async () => {
    const content = input.trim();

    if (!content || isSending) {
      return;
    }

    const nextUserMessage: AgentMessage = {
      id: createId(),
      role: "user",
      content,
      created_at: new Date().toISOString(),
    };

    const assistantMessageId = createId();
    const nextAssistantMessage: AgentMessage = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      created_at: new Date().toISOString(),
      pending: true,
      metadata: {
        agentType: "coworker",
      },
    };

    const requestMessages = [...messages, nextUserMessage].map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      created_at: message.created_at,
    }));

    setMessages((current) => [...current, nextUserMessage, nextAssistantMessage]);
    setInput("");
    setIsSending(true);

    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: requestMessages,
          conversationId: selectedConversationId,
          systemContext: {
            userId: DEMO_USER_ID,
            conversationTitle: selectedConversation?.title,
          },
          userId: DEMO_USER_ID,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? "Your AI assistant hit a snag. Try again.");
      }

      const responseConversationId = response.headers.get("x-conversation-id");

      if (responseConversationId) {
        setSelectedConversationId(responseConversationId);
        void loadConversations(responseConversationId);
      }

      const reader = response.body?.getReader();

      if (!reader) {
        const text = await response.text();
        setMessages((current) =>
          current.map((message) =>
            message.id === assistantMessageId
              ? { ...message, content: text, pending: false }
              : message,
          ),
        );
        return;
      }

      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        accumulated += decoder.decode(value, { stream: true });

        setMessages((current) =>
          current.map((message) =>
            message.id === assistantMessageId
              ? {
                  ...message,
                  content: accumulated,
                  pending: true,
                }
              : message,
          ),
        );
      }

      setMessages((current) =>
        current.map((message) =>
          message.id === assistantMessageId
            ? {
                ...message,
                content: accumulated,
                pending: false,
              }
            : message,
        ),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Your AI assistant hit a snag. Try again.";
      setMessages((current) =>
        current.map((item) =>
          item.id === assistantMessageId
            ? {
                ...item,
                content: message,
                pending: false,
                metadata: {
                  error: true,
                },
              }
            : item,
        ),
      );
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="chat-layout">
      <aside className="card flex min-h-0 flex-col p-4 anim-fade-up delay-1">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="page-kicker">Sessions</div>
            <div className="mt-1 font-[var(--font-bebas)] text-[18px] uppercase tracking-[0.08em] text-[var(--text-1)]">
              Your AI Assistant
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedConversationId(null);
              setMessages([]);
            }}
            className="option-pill !px-3 !py-2"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2} />
            New
          </button>
        </div>

        <div className="mt-5 min-h-0 flex-1 overflow-y-auto pr-1">
          {loadingConversations ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="shimmer-block h-[56px] w-full" />
              ))}
            </div>
          ) : (
            groupedConversations.map((group) => (
              <div key={group.label} className="mb-5">
                <div className="mb-2 font-mono text-[8px] uppercase tracking-[0.2em] text-[var(--text-3)]">
                  {group.label}
                </div>
                <div className="space-y-2">
                  {group.conversations.map((conversation) => {
                    const active = conversation.id === selectedConversationId;
                    return (
                      <button
                        key={conversation.id}
                        type="button"
                        onClick={() => setSelectedConversationId(conversation.id)}
                        className={cn("session-item", active && "is-active")}
                      >
                        <div className="session-item-title">{conversation.title}</div>
                        <div className="mt-2 font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--text-3)]">
                          {formatTimestamp(conversation.updated_at)}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </aside>

      <section className="card flex min-h-0 flex-col anim-fade-up delay-2">
        <div className="chat-header">
          <div>
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-full border"
                style={{ borderColor: "rgba(123,97,255,0.35)", background: "rgba(123,97,255,0.08)" }}
              >
                <Zap className="h-4 w-4 text-[var(--violet)]" strokeWidth={2} />
              </div>
              <div>
                <div className="font-[var(--font-bebas)] text-[22px] uppercase tracking-[0.08em] text-[var(--text-1)]">
                  Your AI Assistant
                </div>
                <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-[var(--violet)]">
                  ONLINE · ACTIVE SESSION
                </div>
              </div>
            </div>
          </div>
          <div className="font-mono text-[8px] uppercase tracking-[0.18em] text-[var(--text-3)]">
            {(selectedConversationId ?? "new").slice(0, 14).toUpperCase()}
          </div>
        </div>

        <div ref={threadRef} className="chat-thread">
          {loadingMessages ? (
            <div className="space-y-4">
              <div className="shimmer-block h-[88px] w-[62%]" />
              <div className="ml-auto shimmer-block h-[72px] w-[48%]" />
              <div className="shimmer-block h-[112px] w-[70%]" />
            </div>
          ) : messages.length === 0 ? (
            <div className="card flex min-h-[260px] flex-col justify-center px-6 py-8">
              <div className="page-kicker">Conversation Ready</div>
              <div className="mt-3 font-comfortaa text-[14px] leading-[1.8] text-[var(--text-2)]">
                Ask what to do next, what is slowing sales down, or who you should contact first.
              </div>
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={message.id}
                className={cn(
                  "message-row",
                  message.role === "assistant" ? "justify-start" : "justify-end",
                )}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                {message.role === "assistant" ? (
                  <div className="flex max-w-[78%] items-start gap-3">
                    <div className="ai-avatar">A</div>
                    <div className="chat-bubble-ai">
                      <div className="whitespace-pre-wrap font-comfortaa text-[14px] leading-[1.75] text-[var(--text-1)]">
                        {message.pending && !message.content ? (
                          <div className="typing-row !ml-0 !mt-0">
                            <span className="typing-dot" />
                            <span className="typing-dot" />
                            <span className="typing-dot" />
                          </div>
                        ) : (
                          message.content
                        )}
                      </div>
                      <div className="message-time mt-3">{formatTime(message.created_at)}</div>
                    </div>
                  </div>
                ) : (
                  <div className="chat-bubble-user">
                    <div className="whitespace-pre-wrap font-comfortaa text-[14px] leading-[1.75] text-[var(--text-1)]">
                      {message.content}
                    </div>
                    <div className="message-time mt-3 text-right">{formatTime(message.created_at)}</div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="chat-inputbar">
          <div className="flex items-end gap-3">
            <div className="hidden rounded-[4px] border border-[var(--border)] bg-[var(--surface-hi)] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--text-2)] md:block">
              Your AI Assistant
            </div>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void handleSubmit();
                }
              }}
              rows={1}
              placeholder="Ask anything about your business..."
              className="input-underline max-h-[136px] min-h-[42px] flex-1 resize-none bg-transparent outline-none"
            />
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={isSending || !input.trim()}
              className={cn("send-button", input.trim() && "!border-[rgba(123,97,255,0.35)] !text-[var(--violet)]")}
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
              ) : (
                <ArrowRight className="h-4 w-4" strokeWidth={2} />
              )}
            </button>
          </div>
          <div className="mt-3 font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--text-3)]">
            Enter to send · Shift+Enter for new line
          </div>
        </div>
      </section>
    </div>
  );
}
