"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ChatContainer } from "@/components/sections/chat-container";
import { ConversationList } from "@/components/sections/conversation-list";
import { useChat } from "@/hooks/use-chat";
import { useExcelData } from "@/hooks/use-excel-data";
import { Conversation, Message } from "@/types";

export const TaskpaneContent = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const tokenRef = useRef<string | null>(null);

  const { refreshData } = useExcelData();

  const handleConversationCreated = useCallback((id: string) => {
    setActiveConversationId(id);
    setRefreshKey((k) => k + 1);
  }, []);

  const { messages, isStreaming, sendMessage, loadMessages } = useChat({
    conversationId: activeConversationId,
    onConversationCreated: handleConversationCreated,
    getToken: () => tokenRef.current,
  });

  // Helper pour les appels API avec le token
  const authFetch = useCallback(async (url: string, options?: RequestInit) => {
    const headers: Record<string, string> = {
      ...(options?.headers as Record<string, string> ?? {}),
    };
    if (tokenRef.current) {
      headers["Authorization"] = `Bearer ${tokenRef.current}`;
    }
    return fetch(url, { ...options, headers });
  }, []);

  // Vérifier l'auth au démarrage (tente cookies puis token stocké)
  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      // Essayer avec le cookie d'abord (accès direct navigateur)
      const res = await fetch("/api/auth/session");
      const data = await res.json();
      if (!cancelled && data?.user) {
        setIsAuthenticated(true);
        return;
      }

      // Essayer avec le token stocké en sessionStorage
      const savedToken = sessionStorage.getItem("auth_token");
      if (savedToken) {
        tokenRef.current = savedToken;
        const tokenRes = await authFetch("/api/conversations");
        if (!cancelled && tokenRes.ok) {
          setIsAuthenticated(true);
          return;
        }
      }

      if (!cancelled) setIsAuthenticated(false);
    };
    check();
    return () => { cancelled = true; };
  }, [authFetch]);

  // Charger les conversations
  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    const load = async () => {
      const res = await authFetch("/api/conversations");
      if (res.ok && !cancelled) {
        const data = await res.json();
        setConversations(data);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [isAuthenticated, refreshKey, authFetch]);

  const handleSelectConversation = async (id: string) => {
    setActiveConversationId(id);
    setShowSidebar(false);
    const res = await authFetch(`/api/conversations/${id}`);
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

  const handleSignIn = useCallback(() => {
    const dialogUrl = `${window.location.origin}/auth/login`;

    Office.context.ui.displayDialogAsync(
      dialogUrl,
      { height: 60, width: 40, promptBeforeOpen: false },
      (asyncResult) => {
        if (asyncResult.status === Office.AsyncResultStatus.Failed) {
          return;
        }
        const dialog = asyncResult.value;

        dialog.addEventHandler(
          Office.EventType.DialogMessageReceived,
          (args: { message: string; origin: string | undefined } | { error: number }) => {
            if ("message" in args) {
              try {
                const data = JSON.parse(args.message);
                if (data.type === "auth_complete" && data.token) {
                  // Stocker le token
                  tokenRef.current = data.token;
                  sessionStorage.setItem("auth_token", data.token);
                  setIsAuthenticated(true);
                }
              } catch {
                // Ancien format (string simple) — fallback
                if (args.message === "auth_complete") {
                  setIsAuthenticated(true);
                }
              }
              dialog.close();
            }
          }
        );

        dialog.addEventHandler(
          Office.EventType.DialogEventReceived,
          () => {
            // Dialog fermé manuellement
          }
        );
      }
    );
  }, []);

  if (isAuthenticated === null) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-gray-400">Chargement...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 p-6">
        <h1 className="text-lg font-semibold text-gray-900">Assistant Comptable Julie</h1>
        <p className="text-center text-sm text-gray-500">
          Connectez-vous avec votre compte Microsoft pour accéder à l&apos;assistant.
        </p>
        <button
          onClick={handleSignIn}
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
