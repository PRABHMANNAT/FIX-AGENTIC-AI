import { useState, useEffect, useRef } from "react";
import type { SocialChatMessage, SocialArtifactType } from "@/types/social";

const generateId = () => Math.random().toString(36).substring(2, 15);

export function useSocialAgent(userId: string, onPreviewExit?: () => void) {
  const [messages, setMessages] = useState<SocialChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentArtifact, setCurrentArtifact] = useState<{ type: SocialArtifactType; data: unknown } | null>(null);
  const [streamingContent, setStreamingContent] = useState("");
  
  const isInitialized = useRef(false);

  useEffect(() => {
    if (!userId) return;
    const storageKey = `social_agent_messages_${userId}`;
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

  useEffect(() => {
    if (!userId || !isInitialized.current) return;
    const storageKey = `social_agent_messages_${userId}`;
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
      localStorage.removeItem(`social_agent_messages_${userId}`);
    }
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: SocialChatMessage = {
      id: generateId(),
      role: "user",
      content,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setStreamingContent("");

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
    
    const attemptFetch = async (): Promise<void> => {
      try {
        let currentType: SocialArtifactType | undefined;
        let currentData: unknown;
        
        setCurrentArtifact((prevArtifact) => {
          if (prevArtifact) {
            currentType = prevArtifact.type;
            currentData = prevArtifact.data;
          }
          return prevArtifact;
        });

        const res = await fetch("/api/social/agent", {
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
                  if (onPreviewExit) onPreviewExit();
                } else if (data.type === "error") {
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
          return attemptFetch();
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
