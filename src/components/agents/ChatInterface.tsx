"use client";

import { CornerDownLeft, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { AgentMessage, ChatInterfaceProps } from "@/types";
import { cn, createId, formatTime } from "@/lib/utils";

export function ChatInterface({
  agentType,
  apiEndpoint,
  systemContext,
  placeholder = "Ask the co-worker to diagnose, prioritize, or execute.",
  initialMessages = [],
  conversationId = null,
  onConversationIdChange,
  onMessagesChange,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<AgentMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  useEffect(() => {
    onMessagesChange?.(messages);
    threadRef.current?.scrollTo({
      top: threadRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, onMessagesChange]);

  const autoResize = () => {
    if (!textareaRef.current) {
      return;
    }

    textareaRef.current.style.height = "0px";
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 136)}px`;
  };

  useEffect(() => {
    autoResize();
  }, [input]);

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
        agentType,
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
      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: requestMessages,
          conversationId,
          systemContext,
          userId: systemContext?.userId,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? "Agent request failed.");
      }

      const responseConversationId = response.headers.get("x-conversation-id");

      if (responseConversationId) {
        onConversationIdChange?.(responseConversationId);
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
      const message = error instanceof Error ? error.message : "Unknown error";
      setMessages((current) =>
        current.map((item) =>
          item.id === assistantMessageId
            ? {
                ...item,
                content: `Something went wrong.\n\n${message}`,
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
    <div className="flex h-full flex-col">
      <div ref={threadRef} className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
        {messages.length === 0 ? (
          <div className="panel grid-surface flex h-full min-h-[260px] flex-col justify-center p-6">
            <div className="system-label text-text-muted">Conversation Ready</div>
            <div className="mt-4 max-w-lg space-y-3 font-syne text-sm leading-relaxed text-text-secondary">
              <p>Use your AI assistant like a practical business helper.</p>
              <p>Ask what to fix first, why sales may be slipping, or who to contact next.</p>
            </div>
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={message.id}
              className={cn(
                "animate-slide-up",
                message.role === "user" ? "flex justify-end" : "flex justify-start",
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div
                className={cn(
                  "max-w-[80%] space-y-2 rounded-md px-4 py-3",
                  message.role === "user"
                    ? "border border-border bg-[#111111]"
                    : "border-l border-l-accent bg-transparent pl-4",
                )}
              >
                <div className="font-syne text-sm leading-relaxed text-white whitespace-pre-wrap">
                  {message.pending && !message.content ? (
                    <span className="thinking-dots inline-flex gap-1">
                      <span />
                      <span />
                      <span />
                    </span>
                  ) : (
                    message.content
                  )}
                </div>
                <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-text-micro">
                  {formatTime(message.created_at)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="border-t border-border bg-black/60 px-6 py-4 backdrop-blur-md">
        <div className="panel bg-[#080808] p-3">
          <div className="flex items-end gap-3">
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
              placeholder={placeholder}
              rows={1}
              className="max-h-[136px] min-h-[44px] flex-1 resize-none border-0 bg-transparent px-2 py-2 text-sm outline-none ring-0 focus:border-0 focus:ring-0"
            />
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={isSending || !input.trim()}
              className="flex h-11 w-11 items-center justify-center rounded-md bg-accent text-black disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
              ) : (
                <CornerDownLeft className="h-4 w-4" strokeWidth={2} />
              )}
            </button>
          </div>
          <div className="mt-3 font-mono text-[9px] uppercase tracking-[0.24em] text-text-micro">
            Press Enter To Send / Shift+Enter For New Line
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatInterface;
