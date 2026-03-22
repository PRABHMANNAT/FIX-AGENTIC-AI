"use client";

import { AnalyticsDashboard } from "./AnalyticsDashboard";
import { MOCK_ANALYTICS } from "@/lib/social-mock-data";

export function PreviewAnalyticsDashboard() {
  return (
    <div className="relative h-full flex flex-col">
      <div className="absolute top-4 left-44 z-50 bg-[var(--surface-hi)] text-[var(--violet)] border border-[rgba(123,97,255,0.3)] px-2 py-0.5 rounded text-[10px] font-mono tracking-wider uppercase shadow-sm pointer-events-none">
        Demo Analytics
      </div>
      <div className="flex-1">
        <AnalyticsDashboard
          metrics={MOCK_ANALYTICS.metrics as any}
          brief={MOCK_ANALYTICS.brief as any}
          isLoading={false}
          onRecordMetrics={() => alert("Connect your real social accounts to record metrics.")}
        />
      </div>
    </div>
  );
}

export default PreviewAnalyticsDashboard;
