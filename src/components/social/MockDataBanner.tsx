"use client";

import { AlertCircle } from "lucide-react";

interface MockDataBannerProps {
  isPreviewMode: boolean;
  onToggle: () => void;
  onConnectReal: () => void;
}

export function MockDataBanner({ isPreviewMode, onToggle, onConnectReal }: MockDataBannerProps) {
  if (!isPreviewMode) return null;

  return (
    <div className="w-full bg-[var(--amber-dim)] border-b border-[rgba(245,158,11,0.2)] px-6 py-2.5 flex items-center justify-between z-50 animate-in slide-in-from-top-4">
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider bg-[rgba(245,158,11,0.15)] text-[var(--amber)] px-2 py-0.5 rounded border border-[rgba(245,158,11,0.3)]">
          <AlertCircle size={12} />
          Preview
        </span>
        <span className="text-[13px] text-[var(--text-1)]">
          You're viewing mock data — connect real accounts to publish
        </span>
      </div>
      <div className="flex items-center gap-3">
        <button 
          onClick={onToggle}
          className="text-[12px] font-medium text-[var(--text-2)] hover:text-[var(--text-1)] transition-colors px-3 py-1.5"
        >
          Exit preview
        </button>
        <button 
          onClick={onConnectReal}
          className="text-[12px] font-medium bg-[var(--amber)] text-white hover:brightness-110 px-4 py-1.5 rounded-lg transition-all shadow-sm"
        >
          Connect accounts
        </button>
      </div>
    </div>
  );
}

export default MockDataBanner;
