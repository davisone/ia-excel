"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession, SessionProvider, signIn } from "next-auth/react";
import { ChatContainer } from "@/components/sections/chat-container";
import { ConversationList } from "@/components/sections/conversation-list";
import { useChat } from "@/hooks/use-chat";
import { useExcelData } from "@/hooks/use-excel-data";
import { Conversation, Message } from "@/types";

const TaskpaneContent = () => {
  const { status } = useSession();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);

  const { refreshData } = useExcelData();

  const [refreshKey, setRefreshKey] = useState(0);

  const handleConversationCreated = useCallback((id: string) => {
    setActiveConversationId(id);
    setRefreshKey((k) => k + 1);
  }, []);

  const { messages, isStreaming, sendMessage, loadMessages } = useChat({
    conversationId: activeConversationId,
    onConversationCreated: handleConversationCreated,
  });

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    const load = async () => {
      const res = await fetch("/api/conversations");
      if (res.ok && !cancelled) {
        const data = await res.json();
        setConversations(data);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [status, refreshKey]);

  const handleSelectConversation = async (id: string) => {
    setActiveConversationId(id);
    setShowSidebar(false);
    const res = await fetch(`/api/conversations/${id}`);
    if (res.ok) {
      const data = await res.json();
      loadMessages(data.messages as Message[]);
    }
  };

  const handleNewConversation = () => {
    setActiveConversationId(null);
    loadMessages([]);
    setShowSidebar(false);
  };

  const handleSend = async (content: string) => {
    const excelData = await refreshData();
    sendMessage(content, excelData);
  };

  // Écran de chargement
  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-gray-400">Chargement...</p>
      </div>
    );
  }

  // Écran de connexion
  if (status === "unauthenticated") {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 p-6">
        <h1 className="text-lg font-semibold text-gray-900">Assistant Comptable IA</h1>
        <p className="text-center text-sm text-gray-500">
          Connectez-vous avec votre compte Microsoft pour accéder à l&apos;assistant.
        </p>
        <button
          onClick={() => signIn("azure-ad")}
          className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          Se connecter avec Microsoft
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <button
        onClick={() => setShowSidebar(!showSidebar)}
        className="fixed left-2 top-2 z-20 rounded-lg bg-white p-1.5 text-gray-600 shadow-md hover:bg-gray-50"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {showSidebar && (
        <div className="absolute inset-0 z-10 w-64">
          <ConversationList
            conversations={conversations}
            activeId={activeConversationId}
            onSelect={handleSelectConversation}
            onNew={handleNewConversation}
          />
        </div>
      )}

      <div className="flex-1">
        <ChatContainer
          messages={messages}
          isStreaming={isStreaming}
          onSend={handleSend}
        />
      </div>
    </div>
  );
};

const TaskpanePage = () => {
  return (
    <SessionProvider>
      <TaskpaneContent />
    </SessionProvider>
  );
};

export default TaskpanePage;
