"use client";

import { ContentCalendar } from "./ContentCalendar";
import { MOCK_CALENDAR, MOCK_CALENDAR_SUGGESTIONS } from "@/lib/social-mock-data";
import { useState } from "react";

export function PreviewContentCalendar() {
  const [scheduled, setScheduled] = useState(MOCK_CALENDAR);

  const handleMockAction = () => {
    alert("Connect your real social accounts to enable scheduling.");
  };

  const handleUnschedule = (id: string) => {
    setScheduled(prev => prev.filter(post => post.id !== id));
  };

  return (
    <div className="relative h-full flex flex-col">
      <div className="absolute top-4 left-44 z-50 bg-[var(--surface-hi)] text-[var(--violet)] border border-[rgba(123,97,255,0.3)] px-2 py-0.5 rounded text-[10px] font-mono tracking-wider uppercase shadow-sm pointer-events-none">
        Demo Data
      </div>
      <div className="flex-1">
        <ContentCalendar
          scheduled={scheduled as any[]}
          suggestions={MOCK_CALENDAR_SUGGESTIONS}
          isLoading={false}
          onSchedulePost={handleMockAction}
          onUnschedule={handleUnschedule}
          onCreateFromSuggestion={handleMockAction}
          onGetSuggestions={() => {}}
        />
      </div>
    </div>
  );
}

export default PreviewContentCalendar;
