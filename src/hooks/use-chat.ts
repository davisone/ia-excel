"use client";

import { useState, useCallback } from "react";
import { Message, ExcelData } from "@/types";

interface UseChatOptions {
  conversationId: string | null;
  onConversationCreated?: (id: string) => void;
}

export const useChat = ({ conversationId, onConversationCreated }: UseChatOptions) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

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
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
    } catch {
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
    } finally {
      setIsStreaming(false);
    }
  }, [conversationId, onConversationCreated]);

  const loadMessages = useCallback((loadedMessages: Message[]) => {
    setMessages(loadedMessages);
  }, []);

  return { messages, isStreaming, sendMessage, loadMessages };
};
