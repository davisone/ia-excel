"use client";

import { Conversation } from "@/types";

interface ConversationListProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
}

export const ConversationList = ({
  conversations,
  activeId,
  onSelect,
  onNew,
}: ConversationListProps) => {
  return (
    <div className="flex h-full flex-col border-r border-white/30 bg-white/60 backdrop-blur-xl">
      <div className="p-3">
        <button
          onClick={onNew}
          className="w-full rounded-2xl bg-gradient-to-r from-pink-500 to-violet-500 px-4 py-2.5 text-sm font-medium text-white shadow-md transition-all hover:shadow-lg hover:brightness-110"
        >
          + Nouvelle conversation
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {conversations.map((conv) => (
          <button
            key={conv.id}
            onClick={() => onSelect(conv.id)}
            className={`w-full border-b border-white/20 px-4 py-3 text-left text-sm transition-all hover:bg-pink-50/50 ${
              activeId === conv.id
                ? "bg-gradient-to-r from-pink-50 to-violet-50 font-medium"
                : ""
            }`}
          >
            <p className="truncate text-gray-900">{conv.title}</p>
            <p className="mt-0.5 text-xs text-gray-400">
              {new Date(conv.updatedAt).toLocaleDateString("fr-FR")}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
};
