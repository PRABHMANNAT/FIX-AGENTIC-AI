// src/app/social/error.tsx
"use client";

import { AlertTriangle, RefreshCcw } from "lucide-react";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex h-screen flex-col items-center justify-center bg-[#000000] p-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(239,68,68,0.1)] text-[var(--ember)] mb-6">
        <AlertTriangle size={32} />
      </div>
      <h2 className="font-display text-[24px] text-[var(--text-1)] mb-2">Something went wrong</h2>
      <p className="text-[14px] text-[var(--text-3)] max-w-md mb-8">
        We encountered an error loading the social workspace. {error?.message}
      </p>
      <button
        onClick={reset}
        className="flex items-center gap-2 rounded-lg bg-[var(--violet)] px-6 py-3 text-[14px] font-medium text-white hover:brightness-110 transition-all"
      >
        <RefreshCcw size={16} /> Try again
      </button>
    </div>
  );
}
