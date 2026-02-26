"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Message } from "@/types";
import { parseExcelActions, getContentWithoutActions, summarizeActions } from "@/lib/excel-actions";
import { writeExcelActions } from "@/lib/excel";

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage = ({ message }: ChatMessageProps) => {
  const isUser = message.role === "user";
  const [applyState, setApplyState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(displayContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const actionsBlock = !isUser ? parseExcelActions(message.content) : null;
  const displayContent = actionsBlock ? getContentWithoutActions(message.content) : message.content;

  const handleApply = async () => {
    if (!actionsBlock) return;
    setApplyState("loading");
    try {
      const success = await writeExcelActions(actionsBlock);
      setApplyState(success ? "done" : "error");
    } catch (err) {
      console.error("[Excel] Exception dans handleApply:", err);
      setApplyState("error");
    }
  };

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
      {!isUser && (
        <div className="mr-2 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-violet-500 text-white">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z" />
          </svg>
        </div>
      )}
      <div className="flex max-w-[80%] flex-col gap-2">
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
            isUser
              ? "bg-gradient-to-br from-pink-500 to-violet-500 text-white"
              : "border border-white/40 bg-white/70 text-gray-900 backdrop-blur-sm"
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{displayContent}</p>
          ) : (
            <div className="prose prose-sm max-w-none prose-headings:mb-2 prose-headings:mt-3 prose-headings:text-gray-900 prose-p:my-1.5 prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5 prose-code:rounded prose-code:bg-pink-50 prose-code:px-1.5 prose-code:py-0.5 prose-code:text-pink-600 prose-code:before:content-none prose-code:after:content-none prose-pre:my-2 prose-pre:rounded-lg prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-table:my-2 prose-th:bg-gray-50 prose-th:px-3 prose-th:py-1.5 prose-td:px-3 prose-td:py-1.5 prose-strong:text-gray-900 prose-a:text-pink-600 prose-a:no-underline hover:prose-a:underline">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {displayContent}
              </ReactMarkdown>
            </div>
          )}
          {!isUser && (
            <button
              onClick={handleCopy}
              className="mt-1 flex items-center gap-1 self-end text-[11px] text-gray-400 transition-colors hover:text-gray-600"
            >
              {copied ? (
                <>
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                  Copié
                </>
              ) : (
                <>
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9.75a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
                  </svg>
                  Copier
                </>
              )}
            </button>
          )}
        </div>

        {actionsBlock && (
          <div className="rounded-2xl border border-pink-200/50 bg-white/80 px-4 py-3 backdrop-blur-sm">
            <p className="mb-2 text-xs font-medium text-gray-500">
              Modifications propos\u00e9es :
            </p>
            <ul className="mb-3 space-y-1">
              {summarizeActions(actionsBlock).map((summary, i) => (
                <li key={i} className="flex items-center gap-2 text-xs text-gray-600">
                  <span className="h-1 w-1 rounded-full bg-pink-400" />
                  {summary}
                </li>
              ))}
            </ul>

            {applyState === "idle" && (
              <button
                onClick={handleApply}
                className="w-full rounded-xl bg-gradient-to-r from-pink-500 to-violet-500 px-4 py-2 text-xs font-medium text-white shadow-sm transition-all hover:shadow-md hover:brightness-110"
              >
                Appliquer les modifications
              </button>
            )}
            {applyState === "loading" && (
              <div className="flex items-center justify-center gap-2 py-2">
                <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-pink-400 [animation-delay:-0.3s]" />
                <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-pink-400 [animation-delay:-0.15s]" />
                <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-pink-400" />
              </div>
            )}
            {applyState === "done" && (
              <div className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-50 py-2 text-xs font-medium text-emerald-600">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
                Modifications appliqu\u00e9es
              </div>
            )}
            {applyState === "error" && (
              <button
                onClick={handleApply}
                className="w-full rounded-xl bg-red-50 px-4 py-2 text-xs font-medium text-red-600 transition-all hover:bg-red-100"
              >
                Erreur — R\u00e9essayer
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
