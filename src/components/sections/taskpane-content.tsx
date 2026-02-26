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
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-pink-50/50 via-white to-purple-50/50">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 animate-bounce rounded-full bg-gradient-to-br from-pink-400 to-violet-400 [animation-delay:-0.3s]" />
          <div className="h-2 w-2 animate-bounce rounded-full bg-gradient-to-br from-pink-400 to-violet-400 [animation-delay:-0.15s]" />
          <div className="h-2 w-2 animate-bounce rounded-full bg-gradient-to-br from-pink-400 to-violet-400" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-6 bg-gradient-to-br from-pink-50/50 via-white to-purple-50/50 p-6">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 to-violet-500 text-white shadow-lg">
          <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z" />
          </svg>
        </div>
        <div className="text-center">
          <h1 className="text-xl font-semibold text-gray-900">Assistant Comptable</h1>
          <p className="mt-1.5 text-sm text-gray-400">
            Connectez-vous pour accéder à votre assistant.
          </p>
        </div>
        <button
          onClick={handleSignIn}
          className="rounded-2xl bg-gradient-to-r from-pink-500 to-violet-500 px-8 py-3 text-sm font-medium text-white shadow-md transition-all hover:shadow-lg hover:brightness-110"
        >
          Se connecter avec Microsoft
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      {showSidebar && (
        <>
          <div
            className="fixed inset-0 z-10 bg-black/20 backdrop-blur-sm"
            onClick={() => setShowSidebar(false)}
          />
          <div className="absolute inset-0 z-20 w-64">
            <ConversationList
              conversations={conversations}
              activeId={activeConversationId}
              onSelect={handleSelectConversation}
              onNew={handleNewConversation}
            />
          </div>
        </>
      )}

      <div className="flex-1">
        <ChatContainer
          messages={messages}
          isStreaming={isStreaming}
          onSend={handleSend}
          onToggleSidebar={() => setShowSidebar(!showSidebar)}
        />
      </div>
    </div>
  );
};
