"use client";

import { ThreadArtifact } from "./ThreadArtifact";
import { MOCK_THREAD } from "@/lib/social-mock-data";

export function PreviewThreadArtifact() {
  const handleMockAction = () => {
    alert("Connect your real social accounts to enable saving and scheduling.");
  };

  return (
    <div className="relative h-full flex flex-col">
       <div className="absolute top-4 left-6 z-50 bg-[var(--surface-hi)] text-[var(--text-2)] border border-[var(--border)] px-2 py-0.5 rounded text-[10px] font-mono tracking-wider uppercase shadow-sm pointer-events-none">
        Demo Thread
      </div>
      <div className="flex-1">
        <ThreadArtifact
          thread={MOCK_THREAD}
          isLoading={false}
          onSave={handleMockAction}
          onSchedule={handleMockAction}
        />
      </div>
    </div>
  );
}

export default PreviewThreadArtifact;
