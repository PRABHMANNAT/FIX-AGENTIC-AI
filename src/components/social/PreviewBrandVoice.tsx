"use client";

import { BrandVoiceTrainer } from "./BrandVoiceTrainer";
import { MOCK_BRAND_VOICE } from "@/lib/social-mock-data";

export function PreviewBrandVoice() {
  const handleMockAction = () => {
    alert("Connect your real social accounts to train your brand voice with real posts.");
  };

  return (
    <div className="relative h-full flex flex-col">
      <div className="absolute top-4 left-64 md:left-44 z-50 bg-[var(--surface-hi)] text-[var(--violet)] border border-[rgba(123,97,255,0.3)] px-2 py-0.5 rounded text-[10px] font-mono tracking-wider uppercase shadow-sm pointer-events-none">
        Demo Voice
      </div>
      <div className="flex-1">
        <BrandVoiceTrainer
          analysis={MOCK_BRAND_VOICE}
          isAnalyzing={false}
          isLoading={false}
          onAnalyze={handleMockAction}
        />
      </div>
    </div>
  );
}

export default PreviewBrandVoice;
