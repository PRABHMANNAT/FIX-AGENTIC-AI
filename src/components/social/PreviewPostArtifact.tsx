"use client";

import { PostArtifact } from "./PostArtifact";
import { MOCK_POSTS } from "@/lib/social-mock-data";

export function PreviewPostArtifact() {
  const handleMockAction = () => {
    alert("Connect your real social accounts to enable saving and publishing.");
  };

  return (
    <div className="relative h-full flex flex-col">
      <div className="absolute top-4 left-6 z-50 bg-[var(--surface-hi)] text-[var(--text-2)] border border-[var(--border)] px-2 py-0.5 rounded text-[10px] font-mono tracking-wider uppercase shadow-sm pointer-events-none">
        Demo Post
      </div>
      <div className="flex-1">
        <PostArtifact
          post={MOCK_POSTS[0]}
          isLoading={false}
          onSave={handleMockAction}
          onSchedule={handleMockAction}
          onPublishNow={handleMockAction}
        />
      </div>
    </div>
  );
}

export default PreviewPostArtifact;
