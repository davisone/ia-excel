"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Message, ExcelData } from "@/types";

interface UseChatOptions {
  conversationId: string | null;
  onConversationCreated?: (id: string) => void;
  getToken: () => string | null;
}

export const useChat = ({ conversationId, onConversationCreated, getToken }: UseChatOptions) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const sendMessage = useCallback(async (content: string, excelData: ExcelData | null) => {
    const userMessage: Message = {
      id: crypto.randomUUID(),
      conversationId: conversationId ?? "",
      role: "user",
      content,
      excelData,
      createdAt: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsStreaming(true);

    const assistantMessage: Message = {
      id: crypto.randomUUID(),
      conversationId: conversationId ?? "",
      role: "assistant",
      content: "",
      excelData: null,
      createdAt: new Date(),
    };

    setMessages((prev) => [...prev, assistantMessage]);

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      const token = getToken();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch("/api/chat", {
        method: "POST",
        headers,
        body: JSON.stringify({
          message: content,
          conversationId,
          excelData,
        }),
      });

      if (!response.ok) throw new Error("Erreur API");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("Pas de stream");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") break;

          const parsed = JSON.parse(data);

          if (parsed.conversationId && !conversationId) {
            onConversationCreated?.(parsed.conversationId);
          }

          if (mountedRef.current) {
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last.role === "assistant") {
                updated[updated.length - 1] = { ...last, content: last.content + parsed.content };
              }
              return updated;
            });
          }
        }
      }
    } catch {
      if (mountedRef.current) {
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last.role === "assistant") {
            updated[updated.length - 1] = {
              ...last,
              content: "Désolé, une erreur est survenue. Veuillez réessayer.",
            };
          }
          return updated;
        });
      }
    } finally {
      if (mountedRef.current) {
        setIsStreaming(false);
      }
    }
  }, [conversationId, onConversationCreated, getToken]);

  const loadMessages = useCallback((loadedMessages: Message[]) => {
    setMessages(loadedMessages);
  }, []);

  return { messages, isStreaming, sendMessage, loadMessages };
};
