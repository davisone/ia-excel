"use client";

import { useRef, useEffect } from "react";
import { ChatMessage } from "@/components/ui/chat-message";
import { ChatInput } from "@/components/ui/chat-input";
import { LoadingDots } from "@/components/ui/loading-dots";
import { Message } from "@/types";

interface ChatContainerProps {
  messages: Message[];
  isStreaming: boolean;
  onSend: (message: string) => void;
  onToggleSidebar?: () => void;
}

const suggestions = [
  "Analyse mon bilan comptable",
  "Vérifie ma TVA du trimestre",
  "Explique-moi cette écriture",
];

export const ChatContainer = ({ messages, isStreaming, onSend, onToggleSidebar }: ChatContainerProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex h-full flex-col bg-gradient-to-br from-pink-50/50 via-white to-purple-50/50">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/30 bg-white/60 px-4 py-3 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-violet-500 text-sm font-bold text-white shadow-md">
            J
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Julie</p>
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <p className="text-xs text-gray-400">En ligne</p>
            </div>
          </div>
        </div>
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="rounded-xl p-2 text-gray-400 transition-colors hover:bg-white/50 hover:text-gray-600"
            title="Historique"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 to-violet-500 text-2xl font-bold text-white shadow-lg">
              J
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-gray-900">Bonjour ! Je suis Julie</p>
              <p className="mt-1 text-sm text-gray-400">Votre assistante comptable</p>
            </div>
            <div className="flex flex-col gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => onSend(s)}
                  className="rounded-2xl border border-white/40 bg-white/60 px-4 py-2.5 text-left text-sm text-gray-600 backdrop-blur-sm transition-all hover:border-pink-200 hover:bg-white/80 hover:text-gray-900 hover:shadow-sm"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
        {isStreaming && messages[messages.length - 1]?.content === "" && <LoadingDots />}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <ChatInput onSend={onSend} disabled={isStreaming} />
    </div>
  );
};
