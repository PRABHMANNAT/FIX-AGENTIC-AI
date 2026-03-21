"use client";

import { useRef, useEffect, useState, forwardRef, useImperativeHandle } from "react";
import { Loader2, Trash2, ArrowRight, CornerDownLeft, FileText, BarChart, Presentation, PieChart } from "lucide-react";
import { useFinanceAgent } from "@/hooks/useFinanceAgent";
import type { ArtifactType } from "@/types/finance";
import { cn } from "@/lib/utils";

export interface FinanceChatPanelProps {
  userId: string;
  onArtifactChange: (type: ArtifactType, data: unknown) => void;
}

const QUICK_ACTIONS = [
  { label: "Generate Invoice", prompt: "Generate a new invoice", icon: FileText },
  { label: "Investor Report", prompt: "Generate my investor update for this month", icon: BarChart },
  { label: "Check Runway", prompt: "What is my current runway and burn rate?", icon: PieChart },
  { label: "Weekly Brief", prompt: "Generate my weekly finance briefing", icon: Presentation },
];

export interface FinanceChatPanelRef {
  sendMessage: (content: string) => void;
}

export const FinanceChatPanel = forwardRef<FinanceChatPanelRef, FinanceChatPanelProps>(
  ({ userId, onArtifactChange }, ref) => {
  const {
    messages,
    isLoading,
    currentArtifact,
    streamingContent,
    sendMessage,
    clearMessages,
  } = useFinanceAgent(userId);

  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useImperativeHandle(ref, () => ({
    sendMessage: (content: string) => {
      sendMessage(content);
    },
  }));

  // Auto-scroll logic
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingContent, isLoading]);

  // Auto-resize textarea
  const autoResize = () => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = "0px";
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 136)}px`;
  };

  useEffect(() => {
    autoResize();
  }, [input]);

  // Handle artifact change callback
  useEffect(() => {
    if (currentArtifact) {
      onArtifactChange(currentArtifact.type, currentArtifact.data);
    }
  }, [currentArtifact, onArtifactChange]);

  const handleSubmit = () => {
    if (!input.trim() || isLoading) return;
    sendMessage(input);
    setInput("");
  };

  const handleChipClick = (prompt: string) => {
    if (isLoading) return;
    sendMessage(prompt);
  };

  // Replace Markdown artifact tags to not show them raw in the bubble
  const renderContent = (content: string) => {
    // We strip the entire artifact tag and its JSON contents from the visible text
    const cleanContent = content.replace(/<artifact[\s\S]*?<\/artifact>/g, "").trim();
    return cleanContent;
  };

  return (
    <div className="flex h-full flex-col bg-[var(--background)]">
      {/* ── HEADER ── */}
      <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4 bg-[var(--surface)]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="font-display font-medium text-[15px] text-[var(--text-1)]">Finance Agent</span>
            <div className="flex items-center gap-1.5 rounded-full bg-[rgba(16,185,129,0.1)] px-2 py-0.5 border border-[rgba(16,185,129,0.2)]">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-mono text-[9px] uppercase tracking-wider text-emerald-500">Online</span>
            </div>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={clearMessages}
            className="text-[var(--text-3)] hover:text-[var(--text-1)] transition-colors"
            title="Clear Chat"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {/* ── MESSAGES RUNTIME ── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6 pb-32">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col justify-center items-center text-center">
            <div className="panel flex flex-col justify-center items-center p-8 max-w-sm">
              <h3 className="font-display text-[18px] text-[var(--text-1)] mb-2">Ask me anything about your finances.</h3>
              <p className="font-mono text-[12px] text-[var(--text-3)] leading-relaxed">
                I can generate invoices, reports, pitch decks, cash flow models, and analyze your runway.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {messages.map((message, index) => {
              const isUser = message.role === "user";
              const contentToRender = renderContent(message.content);
              const hasArtifact = !!message.artifactType || message.content.includes("<artifact");

              // Derive the exact artifact type if it exists in content but wasn't fully parsed yet (while streaming)
              let inferredArtifactType = message.artifactType;
              if (!inferredArtifactType && hasArtifact) {
                const match = message.content.match(/<artifact\s+type=['"]([^'"]+)['"]/);
                if (match) inferredArtifactType = match[1] as ArtifactType;
              }

              // Typing indicator for an empty system message while loading
              const isTyping = isLoading && !isUser && index === messages.length - 1 && !message.content;

              return (
                <div
                  key={message.id}
                  className={cn(
                    "flex animate-slide-up",
                    isUser ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[85%] space-y-3 px-4 py-3 text-[14px] leading-relaxed",
                      isUser
                        ? "rounded-2xl rounded-tr-sm bg-[var(--surface-hi)] border border-[var(--border)] text-[var(--text-1)]"
                        : "rounded-2xl rounded-tl-sm bg-transparent border-l-2 border-l-[var(--violet)] pl-5 text-[var(--text-2)]"
                    )}
                  >
                    {!isUser && (
                      <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--violet)] mb-1">
                        Finance Agent
                      </div>
                    )}

                    {isTyping ? (
                      <span className="flex gap-1 items-center h-4">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-3)] animate-pulse" />
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-3)] animate-pulse" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-3)] animate-pulse" style={{ animationDelay: '300ms' }} />
                      </span>
                    ) : (
                      <div className="whitespace-pre-wrap">{contentToRender}</div>
                    )}

                    {message.fallback && (
                      <div className="mt-1 flex items-center gap-1.5 pt-1 border-t border-[var(--border)] opacity-80">
                        <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />
                        <span className="font-mono text-[9px] uppercase tracking-wider text-orange-400">Using OpenAI backup</span>
                      </div>
                    )}

                    {/* Render Artifact Pill if this message generated one */}
                    {hasArtifact && inferredArtifactType && (
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (message.artifactType && message.artifactData) {
                              onArtifactChange(message.artifactType, message.artifactData);
                            }
                          }}
                          className="flex items-center gap-2 rounded-full border border-[var(--violet)] bg-[rgba(123,97,255,0.05)] px-3 py-1.5 hover:bg-[rgba(123,97,255,0.1)] transition-colors group"
                        >
                          <FileText size={12} className="text-[var(--violet)]" />
                          <span className="font-mono text-[11px] text-[var(--violet)] capitalize">
                            {inferredArtifactType.replace("_", " ")} Document
                          </span>
                          <ArrowRight size={12} className="text-[var(--violet)] opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── BOTTOM INPUT STRIP ── */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[var(--background)] via-[var(--background)] to-transparent pt-10 pb-6 px-6">
        
        {/* Quick Actions (only show if no messages) */}
        {messages.length === 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {QUICK_ACTIONS.map((action, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleChipClick(action.prompt)}
                className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 hover:bg-[var(--surface-hi)] hover:border-[var(--border-hi)] transition-colors"
              >
                <action.icon size={12} className="text-[var(--text-3)]" />
                <span className="font-mono text-[11px] text-[var(--text-2)]">{action.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Input Bar */}
        <div className="panel p-2 bg-[var(--surface-hi)] border-[var(--border-hi)] shadow-2xl relative">
          <div className="flex items-end gap-3">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder="Message your financial assistant..."
              rows={1}
              className="max-h-[136px] min-h-[44px] flex-1 resize-none border-0 bg-transparent px-3 py-3 text-[14px] text-[var(--text-1)] placeholder-[var(--text-3)] font-comfortaa focus:outline-none focus:ring-0"
            />
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading || !input.trim()}
              className="mb-1 flex h-10 w-10 items-center justify-center rounded bg-[var(--violet)] text-white disabled:opacity-30 disabled:cursor-not-allowed hover:brightness-110 transition-all"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CornerDownLeft className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
        <div className="mt-3 text-center font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--text-3)]">
          Press Enter To Send / Shift+Enter For New Line
        </div>
      </div>
    </div>
  );
});

FinanceChatPanel.displayName = "FinanceChatPanel";

