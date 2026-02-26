"use client";

import { Conversation } from "@/types";

interface ConversationListProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}

export const ConversationList = ({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
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
          <div
            key={conv.id}
            className={`group flex items-center border-b border-white/20 transition-all hover:bg-pink-50/50 ${
              activeId === conv.id
                ? "bg-gradient-to-r from-pink-50 to-violet-50 font-medium"
                : ""
            }`}
          >
            <button
              onClick={() => onSelect(conv.id)}
              className="flex-1 px-4 py-3 text-left text-sm"
            >
              <p className="truncate text-gray-900">{conv.title}</p>
              <p className="mt-0.5 text-xs text-gray-400">
                {new Date(conv.updatedAt).toLocaleDateString("fr-FR")}
              </p>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(conv.id);
              }}
              className="mr-2 rounded-lg p-1.5 text-gray-300 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
