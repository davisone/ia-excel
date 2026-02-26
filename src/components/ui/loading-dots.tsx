"use client";

export const LoadingDots = () => {
  return (
    <div className="mb-3 flex justify-start">
      <div className="mr-2 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-violet-500 text-xs font-bold text-white">
        J
      </div>
      <div className="flex items-center gap-1.5 rounded-2xl border border-white/40 bg-white/70 px-4 py-3 backdrop-blur-sm">
        <div className="h-2 w-2 animate-bounce rounded-full bg-gradient-to-br from-pink-400 to-violet-400 [animation-delay:-0.3s]" />
        <div className="h-2 w-2 animate-bounce rounded-full bg-gradient-to-br from-pink-400 to-violet-400 [animation-delay:-0.15s]" />
        <div className="h-2 w-2 animate-bounce rounded-full bg-gradient-to-br from-pink-400 to-violet-400" />
      </div>
    </div>
  );
};
