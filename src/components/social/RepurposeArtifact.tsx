"use client";

import { useState, useEffect } from "react";
import { Save, Copy, FileText, ChevronRight, CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";
import LoadingShimmer from "@/components/ui/LoadingShimmer";
import { cn } from "@/lib/utils";
import type { SocialPlatform, PostType } from "@/types/social";

interface RepurposedPost {
  platform: SocialPlatform;
  post_type: PostType;
  content: string;
  angle: string;
  char_count: number;
}

interface RepurposeArtifactProps {
  repurposed: RepurposedPost[] | null;
  keyInsights: string[];
  unusedAngles: string[];
  isLoading: boolean;
  onSaveAll: () => void;
  onSaveSingle: (index: number) => void;
  onEditAndSave: (index: number, content: string) => void;
  onUseAngle?: (angle: string) => void;
}

const PLATFORM_COLORS = {
  linkedin: "bg-blue-600 dark:bg-blue-500",
  twitter: "bg-neutral-900 dark:bg-neutral-100",
  instagram: "bg-pink-600 dark:bg-pink-500",
  whatsapp: "bg-green-600 dark:bg-green-500",
};

const PLATFORM_LIMITS: Record<SocialPlatform, number> = {
  linkedin: 3000,
  twitter: 280,
  instagram: 2200,
  whatsapp: 500
};

export function RepurposeArtifact({
  repurposed: initialRepurposed,
  keyInsights,
  unusedAngles,
  isLoading,
  onSaveAll,
  onSaveSingle,
  onEditAndSave,
  onUseAngle
}: RepurposeArtifactProps) {
  const [localPosts, setLocalPosts] = useState<RepurposedPost[]>([]);
  const [savingIndices, setSavingIndices] = useState<number[]>([]);
  const [savingAll, setSavingAll] = useState(false);

  useEffect(() => {
    if (initialRepurposed) {
      setLocalPosts([...initialRepurposed]);
    }
  }, [initialRepurposed]);

  if (isLoading) {
    return (
      <div className="panel flex flex-col gap-0 overflow-hidden anim-fade-in h-full bg-[var(--surface)]">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-5">
          <LoadingShimmer className="h-6 w-40 rounded" />
          <LoadingShimmer className="h-9 w-32 rounded-lg" />
        </div>
        <div className="p-6 border-b border-[var(--border)] bg-[var(--background)]">
          <LoadingShimmer className="h-4 w-48 mb-6" />
          <div className="space-y-4">
             {[1,2,3].map(i => <LoadingShimmer key={i} className="h-4 w-full rounded" />)}
          </div>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5 flex-1">
           {[1,2,3,4].map(i => (
             <div key={i} className="border border-[var(--border)] rounded-xl p-5 h-56 bg-[var(--surface-hi)]">
               <div className="flex gap-2 mb-4">
                 <LoadingShimmer className="h-5 w-16" />
                 <LoadingShimmer className="h-5 w-24" />
               </div>
               <LoadingShimmer className="h-3 w-full mb-3" />
               <LoadingShimmer className="h-3 w-5/6 mb-5" />
               <LoadingShimmer className="h-24 w-full rounded" />
             </div>
           ))}
        </div>
      </div>
    );
  }

  if (!localPosts || localPosts.length === 0) {
    return (
      <div className="panel flex h-full flex-col justify-center items-center text-center p-8 bg-[var(--surface-hi)]">
        <div className="flex flex-col items-center max-w-sm">
          <div className="h-12 w-12 rounded-full bg-[rgba(123,97,255,0.1)] flex items-center justify-center mb-4 text-[var(--violet)]">
            <Copy size={24} />
          </div>
          <h3 className="font-display text-[18px] text-[var(--text-1)] mb-2">Ask the agent to repurpose your content</h3>
          <p className="font-mono text-[12px] text-[var(--text-3)] leading-relaxed">
            I can transform your blogs, notes, or reports into high-converting posts for multiple platforms at once.
          </p>
        </div>
      </div>
    );
  }

  const handleContentChange = (index: number, content: string) => {
    const newPosts = [...localPosts];
    newPosts[index].content = content;
    newPosts[index].char_count = content.length;
    setLocalPosts(newPosts);
  };

  const handleBlur = (index: number) => {
    onEditAndSave(index, localPosts[index].content);
  };

  return (
    <div className="panel flex flex-col h-full bg-[var(--surface)] overflow-hidden">
      
      {/* ── HEADER ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-6 py-4 bg-[var(--surface-hi)] z-10 shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="font-display text-[16px] text-[var(--text-1)] flex items-center gap-2">
             <span className="w-2 h-2 rounded-full bg-[var(--violet)]"></span>
             {localPosts.length} formats created
          </span>
        </div>
        <button
          onClick={() => {
            setSavingAll(true);
            onSaveAll();
            setTimeout(() => setSavingAll(false), 1000);
          }}
          className="flex items-center gap-2 bg-[var(--violet)] text-white hover:brightness-110 px-5 py-2 rounded-lg text-[13px] font-medium transition-all shadow-md shadow-[rgba(123,97,255,0.2)]"
        >
          {savingAll ? <CheckCircle2 size={16} className="animate-in fade-in" /> : <Save size={16} />}
          {savingAll ? "Saved!" : "Save all drafts"}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        
        {/* ── KEY INSIGHTS ── */}
        {keyInsights && keyInsights.length > 0 && (
          <div className="px-6 py-8 border-b border-[var(--border)] bg-[var(--background)]">
            <h4 className="text-[11px] font-mono uppercase tracking-widest text-[var(--text-3)] mb-5">Key insights extracted</h4>
            <ul className="space-y-4">
              {keyInsights.map((insight, i) => (
                <li key={i} className="flex items-start gap-4">
                  <div className="mt-2 w-1.5 h-1.5 rounded-full bg-[var(--violet)] flex-shrink-0" />
                  <span className="text-[14px] text-[var(--text-1)] leading-relaxed font-medium">{insight}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ── REPURPOSED POSTS GRID ── */}
        <div className="p-6 md:p-8 bg-[var(--surface)]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {localPosts.map((post, i) => {
              const charLimit = PLATFORM_LIMITS[post.platform] || 280;
              const overLimit = post.char_count > charLimit;
              const isSaving = savingIndices.includes(i);
              
              return (
                <div key={i} className="flex flex-col border border-[var(--border)] rounded-xl bg-[var(--surface-hi)] overflow-hidden shadow-sm hover:border-[var(--violet)] hover:shadow-md transition-all relative group">
                  
                  {/* Color indicator top right */}
                  <div className={cn(
                    "absolute top-0 right-0 w-24 h-1.5 transition-colors",
                    PLATFORM_COLORS[post.platform] || "bg-[var(--violet)]"
                  )} />

                  <div className="p-5 flex-1 flex flex-col">
                    {/* Top Badges */}
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-[10px] uppercase font-mono tracking-wider bg-[var(--background)] border border-[var(--border)] px-2 py-0.5 rounded text-[var(--text-2)] font-semibold">
                        {post.platform}
                      </span>
                      {post.post_type && (
                        <span className="text-[10px] uppercase font-mono tracking-wider bg-[var(--background)] border border-[var(--border)] px-2 py-0.5 rounded text-[var(--text-3)]">
                          {post.post_type.replace('_', ' ')}
                        </span>
                      )}
                    </div>

                    {/* Angle */}
                    <div className="text-[12px] text-[var(--text-2)] italic mb-4 border-l-2 border-[var(--border-hi)] pl-3 leading-relaxed">
                      Angle: {post.angle}
                    </div>

                    {/* Content */}
                    <textarea 
                      value={post.content}
                      onChange={(e) => handleContentChange(i, e.target.value)}
                      onBlur={() => handleBlur(i)}
                      className="w-full bg-transparent resize-none outline-none text-[14px] text-[var(--text-1)] leading-relaxed flex-1 min-h-[160px] focus:bg-[var(--background)] transition-colors p-3 rounded -mx-3 border border-transparent focus:border-[var(--border)]"
                    />
                  </div>

                  {/* Footer */}
                  <div className="px-5 py-3 border-t border-[var(--border)] bg-[var(--background)] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                       <span className={cn(
                         "text-[11px] font-mono",
                         overLimit ? "text-[var(--ember)]" : "text-[var(--text-3)]"
                       )}>
                         {post.char_count} / {charLimit}
                       </span>
                       {overLimit && <AlertTriangle size={14} className="text-[var(--ember)]" />}
                    </div>
                    
                    <button
                      onClick={() => {
                        setSavingIndices(prev => [...prev, i]);
                        onSaveSingle(i);
                        setTimeout(() => setSavingIndices(prev => prev.filter(idx => idx !== i)), 1000);
                      }}
                      className="text-[12px] font-medium text-[var(--text-2)] hover:text-[var(--violet)] flex items-center gap-1.5 transition-colors bg-[var(--surface-hi)] border border-[var(--border)] px-3 py-1.5 rounded-lg hover:border-[var(--violet)]"
                    >
                      {isSaving ? <CheckCircle2 size={14} className="text-[var(--green)]" /> : <Save size={14} />}
                      {isSaving ? "Saved" : "Save draft"}
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        </div>

        {/* ── UNUSED ANGLES ── */}
        {unusedAngles && unusedAngles.length > 0 && (
          <div className="px-6 py-8 border-t border-[var(--border)] bg-[var(--surface-hi)]">
             <h4 className="text-[12px] font-mono uppercase tracking-widest text-[var(--text-3)] mb-5">Other angles you could use</h4>
             <div className="flex flex-wrap gap-3">
               {unusedAngles.map((angle, i) => (
                 <button
                   key={i}
                   onClick={() => onUseAngle?.(angle)}
                   className="flex items-center gap-3 text-left bg-[var(--background)] border border-[var(--border)] hover:border-[var(--violet)] px-4 py-3 rounded-xl text-[13px] text-[var(--text-2)] hover:text-[var(--text-1)] transition-all group shadow-sm hover:shadow-md"
                 >
                   <span className="line-clamp-2 max-w-sm leading-relaxed">{angle}</span>
                   <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 text-[var(--violet)] -translate-x-2 group-hover:translate-x-0" />
                 </button>
               ))}
             </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default RepurposeArtifact;
