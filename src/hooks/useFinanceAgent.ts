import { useState, useEffect, useRef } from "react";
import type { ChatMessage, ArtifactType } from "@/types/finance";

// Use a simple ID generator since standard crypto.randomUUID isn't guaranteed client-side without polyfills
const generateId = () => Math.random().toString(36).substring(2, 15);

export function useFinanceAgent(userId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentArtifact, setCurrentArtifact] = useState<{ type: ArtifactType; data: unknown } | null>(null);
  const [streamingContent, setStreamingContent] = useState("");
  
  const isInitialized = useRef(false);

  // Load from local storage
  useEffect(() => {
    if (!userId) return;
    const storageKey = `finance_agent_messages_${userId}`;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        setMessages(JSON.parse(stored));
      } catch (err) {
        console.error("Failed to parse cached chat messages", err);
      }
    }
    isInitialized.current = true;
  }, [userId]);

  // Save to local storage when messages change
  useEffect(() => {
    if (!userId || !isInitialized.current) return;
    const storageKey = `finance_agent_messages_${userId}`;
    // keep max 50 messages
    const messagesToSave = messages.slice(-50);
    localStorage.setItem(storageKey, JSON.stringify(messagesToSave));
  }, [messages, userId]);

  const clearArtifact = () => {
    setCurrentArtifact(null);
  };

  const clearMessages = () => {
    setMessages([]);
    setCurrentArtifact(null);
    if (userId) {
      localStorage.removeItem(`finance_agent_messages_${userId}`);
    }
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    // 1. Add user message
    const userMessage: ChatMessage = {
      id: generateId(),
      role: "user",
      content,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setStreamingContent("");

    // 3. Add an empty assistant message
    const placeholderAssistantId = generateId();
    setMessages((prev) => [
      ...prev,
      {
        id: placeholderAssistantId,
        role: "assistant",
        content: "",
        timestamp: new Date().toISOString(),
      },
    ]);

    let retryCount = 0;
    
    // Attempt function to handle fetch + parsing
    const attemptFetch = async (): Promise<void> => {
      try {
        let currentType: ArtifactType | undefined;
        let currentData: unknown;
        
        setCurrentArtifact((prevArtifact) => {
          if (prevArtifact) {
            currentType = prevArtifact.type;
            currentData = prevArtifact.data;
          }
          return prevArtifact;
        });

        const res = await fetch("/api/finance/agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [...messages, userMessage],
            userId,
            currentArtifactType: currentType,
            currentArtifactData: currentData,
          }),
        });

        if (!res.ok) throw new Error("Failed to send message: " + (await res.text()));
        if (!res.body) throw new Error("No readable stream available");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let assistantText = "";
        let isDone = false;
        let didFallback = false;

        while (!isDone) {
          const { value, done } = await reader.read();
          if (done) {
            isDone = true;
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const dataStr = line.slice("data: ".length).trim();
              if (!dataStr) continue;

              try {
                const data = JSON.parse(dataStr);
                
                if (data.type === "fallback") {
                  didFallback = true;
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === placeholderAssistantId ? { ...m, fallback: true } : m
                    )
                  );
                } else if (data.type === "token") {
                  assistantText += data.content;
                  setStreamingContent(assistantText);
                  
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === placeholderAssistantId ? { ...m, content: assistantText, fallback: didFallback } : m
                    )
                  );
                } else if (data.type === "artifact") {
                  setCurrentArtifact({ type: data.artifactType, data: data.data });
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === placeholderAssistantId
                        ? { ...m, artifactType: data.artifactType, artifactData: data.data }
                        : m
                    )
                  );
                } else if (data.type === "error") {
                  // Show meaningful error in message bubble instead of generic fallback
                  const errorMsg = `I encountered an error. Please try again. Details: ${data.message || data.content || 'Unknown error'}`;
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === placeholderAssistantId ? { ...m, content: errorMsg } : m
                    )
                  );
                  setIsLoading(false);
                  setStreamingContent("");
                  isDone = true;
                } else if (data.type === "done") {
                  isDone = true;
                }
              } catch (e: any) {
                // Not JSON or parse error; might be expected if stream breaks
                if (e.message && line.includes("error")) throw e;
              }
            }
          }
        }

        setIsLoading(false);
        setStreamingContent("");
      } catch (error: any) {
        console.error("Stream error:", error);
        if (retryCount === 0) {
          retryCount++;
          console.log("Retrying stream in 1 second...");
          await new Promise(resolve => setTimeout(resolve, 1000));
          return attemptFetch(); // Retry once
        } else {
          setIsLoading(false);
          setStreamingContent("");
          setMessages((prev) =>
            prev.map((m) =>
              m.id === placeholderAssistantId
                ? { ...m, content: "Something went wrong. Please try again." }
                : m
            )
          );
        }
      }
    };

    attemptFetch();
  };

  return {
    messages,
    isLoading,
    currentArtifact,
    streamingContent,
    sendMessage,
    clearArtifact,
    clearMessages,
  };
}
