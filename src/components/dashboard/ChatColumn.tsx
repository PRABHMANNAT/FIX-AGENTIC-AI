"use client";

import { ArrowUp, ChevronDown, ExternalLink, Zap } from "lucide-react";
import { useEffect, useRef } from "react";
import type { BMOProfile, DashboardChatActionButton } from "@/types";

export interface DashboardThreadMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export function ChatColumn({
  messages,
  input,
  onInputChange,
  onSend,
  isThinking,
  terminalLines,
  actionButton,
  onAction,
  bmoContext,
}: {
  messages: DashboardThreadMessage[];
  input: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  isThinking: boolean;
  terminalLines: string[];
  actionButton: DashboardChatActionButton | null;
  onAction: (action: DashboardChatActionButton) => void;
  bmoContext: BMOProfile | null;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [actionButton, isThinking, messages, terminalLines]);

  useEffect(() => {
    if (!textareaRef.current) {
      return;
    }

    textareaRef.current.style.height = "0px";
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 80)}px`;
  }, [input]);

  return (
    <section className="chat-column">
      <div className="chat-header">
        <div className="chat-header-left">
          <div className="agent-avatar">
            <Zap size={14} style={{ color: "var(--violet)" }} />
          </div>
          <div>
            <div className="agent-name">Central AI Agent</div>
            <div className="agent-status">
              <span className="live-dot" />
              ONLINE & TRACKING
            </div>
          </div>
        </div>

        <div className="chat-header-right">
          {bmoContext?.industry ? <span className="context-badge">{bmoContext.industry}</span> : null}
          {bmoContext?.market_type ? <span className="context-badge">{bmoContext.market_type}</span> : null}
        </div>
      </div>

      <div className="chat-thread" ref={scrollRef}>
        {messages.map((message) =>
          message.role === "assistant" ? (
            <div key={message.id} className="msg-ai">
              <div className="msg-ai-avatar">AI</div>
              <div className="min-w-0">
                <div className="msg-ai-label">Central AI Agent</div>
                <div className="msg-ai-text">{message.content}</div>
              </div>
            </div>
          ) : (
            <div key={message.id} className="msg-user">
              <div>
                <div className="msg-user-label">You</div>
                <div className="msg-user-bubble">{message.content}</div>
              </div>
            </div>
          ),
        )}

        {isThinking ? (
          <div className="terminal-block">
            {terminalLines.map((line, index) => (
              <div
                key={`${line}-${index}`}
                className="terminal-line"
                style={{ animationDelay: `${index * 0.3}s` }}
              >
                &gt; {line}
              </div>
            ))}
            {terminalLines.length ? <div className="terminal-cursor">_</div> : null}
          </div>
        ) : null}

        {actionButton ? (
          <div className="action-btn-wrap">
            <button
              type="button"
              className={`action-btn ${actionButton.type === "primary" ? "primary" : ""} ${actionButton.type === "halt" ? "halt-btn" : ""}`}
              onClick={() => onAction(actionButton)}
            >
              {actionButton.label}
              {actionButton.type !== "halt" ? <ExternalLink size={12} /> : null}
            </button>
          </div>
        ) : null}
      </div>

      <div className="chat-input-bar">
        <button type="button" className="agent-selector">
          <Zap size={12} style={{ color: "var(--violet)" }} />
          <span>AI Assistant</span>
          <ChevronDown size={10} />
        </button>

        <div className="input-row">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(event) => onInputChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                onSend();
              }
            }}
            placeholder="Message your AI team..."
            rows={1}
            className="chat-textarea"
          />
          <button
            type="button"
            className="send-btn"
            onClick={onSend}
            disabled={!input.trim() || isThinking}
          >
            <ArrowUp size={14} />
          </button>
        </div>

        <div className="input-hint">ENTER TO SEND · SHIFT+ENTER FOR NEW LINE</div>
      </div>
    </section>
  );
}

export default ChatColumn;
