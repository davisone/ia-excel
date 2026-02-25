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
    <div className="flex h-full flex-col border-r border-gray-200 bg-gray-50">
      <div className="p-3">
        <button
          onClick={onNew}
          className="w-full rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          + Nouvelle conversation
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {conversations.map((conv) => (
          <button
            key={conv.id}
            onClick={() => onSelect(conv.id)}
            className={`w-full border-b border-gray-100 px-4 py-3 text-left text-sm transition-colors hover:bg-gray-100 ${
              activeId === conv.id ? "bg-blue-50 font-medium" : ""
            }`}
          >
            <p className="truncate">{conv.title}</p>
            <p className="mt-0.5 text-xs text-gray-400">
              {new Date(conv.updatedAt).toLocaleDateString("fr-FR")}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
};
