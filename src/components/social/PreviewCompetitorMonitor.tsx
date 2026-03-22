"use client";

import { CompetitorMonitor } from "./CompetitorMonitor";
import { MOCK_COMPETITORS } from "@/lib/social-mock-data";
import { useState } from "react";

export function PreviewCompetitorMonitor() {
  const [competitors, setCompetitors] = useState(MOCK_COMPETITORS);

  const handleMockAction = () => {
    alert("Connect your real social accounts to add or analyze competitors.");
  };

  const handleRemove = (id: string) => {
    setCompetitors(prev => prev.filter(c => c.id !== id));
  };

  return (
    <div className="relative h-full flex flex-col">
      <div className="absolute top-4 left-64 z-50 bg-[var(--surface-hi)] text-[var(--violet)] border border-[rgba(123,97,255,0.3)] px-2 py-0.5 rounded text-[10px] font-mono tracking-wider uppercase shadow-sm pointer-events-none">
        Demo Data
      </div>
      <div className="flex-1">
        <CompetitorMonitor
          competitors={competitors}
          isLoading={false}
          onAdd={handleMockAction}
          onRemove={handleRemove}
          onAnalyze={handleMockAction}
        />
      </div>
    </div>
  );
}

export default PreviewCompetitorMonitor;
