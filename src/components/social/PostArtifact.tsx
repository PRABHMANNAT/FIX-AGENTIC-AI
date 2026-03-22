"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, Plus, X, Calendar, Send, Save, Image as ImageIcon, Edit3, AlertTriangle } from "lucide-react";
import LoadingShimmer from "@/components/ui/LoadingShimmer";
import type { SocialPost, SocialPlatform } from "@/types/social";
import { cn } from "@/lib/utils";

interface PostArtifactProps {
  post: SocialPost | null;
  isLoading: boolean;
  onSave: (post: SocialPost) => void;
  onSchedule: (post: SocialPost, platform: SocialPlatform, scheduledAt: string) => void;
  onPublishNow: (post: SocialPost, platform: SocialPlatform) => void;
  changedFields?: string[];
}

const PLATFORMS: SocialPlatform[] = ['linkedin', 'twitter', 'instagram', 'whatsapp'];
const PLATFORM_LABELS: Record<SocialPlatform, string> = {
  linkedin: "LinkedIn",
  twitter: "Twitter",
  instagram: "Instagram",
  whatsapp: "WhatsApp"
};
const PLATFORM_LIMITS: Record<SocialPlatform, number> = {
  linkedin: 3000,
  twitter: 280,
  instagram: 2200,
  whatsapp: 500
};

function useFieldFlash(fieldName: string, changedFields: string[]): boolean {
  const changed = changedFields.includes(fieldName);
  const [flashing, setFlashing] = useState(false);
  const prevRef = useRef(changed);

  useEffect(() => {
    if (changed && !prevRef.current) {
      setFlashing(true);
      const t = setTimeout(() => setFlashing(false), 900);
      prevRef.current = false;
      return () => clearTimeout(t);
    }
    if (!changed) prevRef.current = false;
  }, [changed]);

  return flashing;
}

export function PostArtifact({
  post: initialPost,
  isLoading,
  onSave,
  onSchedule,
  onPublishNow,
  changedFields = [],
}: PostArtifactProps) {
  const [activeTab, setActiveTab] = useState<SocialPlatform>('linkedin');
  const [post, setPost] = useState<SocialPost | null>(initialPost);
  const [newTag, setNewTag] = useState("");
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  
  // Flash hooks
  const contentLinkedinFlash = useFieldFlash("content_linkedin", changedFields);
  const contentTwitterFlash = useFieldFlash("content_twitter", changedFields);
  const contentInstagramFlash = useFieldFlash("content_instagram", changedFields);
  const contentWhatsappFlash = useFieldFlash("content_whatsapp", changedFields);

  useEffect(() => {
    if (initialPost) setPost(initialPost);
  }, [initialPost]);

  if (isLoading) {
    return (
      <div className="panel flex flex-col gap-0 overflow-hidden anim-fade-in h-full">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <LoadingShimmer className="h-6 w-32 rounded" />
          <LoadingShimmer className="h-8 w-48 rounded" />
        </div>
        <div className="flex gap-4 p-5">
           {[1,2,3,4].map((i) => <LoadingShimmer key={i} className="h-8 w-20 rounded-full" />)}
        </div>
        <div className="p-5">
          <LoadingShimmer className="h-4 w-full mb-2" />
          <LoadingShimmer className="h-4 w-5/6 mb-2" />
          <LoadingShimmer className="h-4 w-4/6 mb-8" />
          
          <LoadingShimmer className="h-32 w-full rounded" />
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="panel flex h-full flex-col justify-center items-center text-center p-8 bg-[var(--surface-hi)]">
        <div className="flex flex-col items-center max-w-sm">
          <div className="h-12 w-12 rounded-full bg-[rgba(123,97,255,0.1)] flex items-center justify-center mb-4 text-[var(--violet)]">
            <Edit3 size={24} />
          </div>
          <h3 className="font-display text-[18px] text-[var(--text-1)] mb-2">Ask the Social Agent to write your first post</h3>
          <p className="font-mono text-[12px] text-[var(--text-3)] leading-relaxed">
            I can help you build authority on LinkedIn, go viral on Twitter, tell stories on Instagram, and engage your community on WhatsApp.
          </p>
        </div>
      </div>
    );
  }

  const updateContent = (content: string) => {
    if (!post) return;
    setPost({ ...post, [`content_${activeTab}`]: content });
  };

  const handleAddTag = () => {
    if (!post || !newTag.trim()) return;
    const tag = newTag.trim().replace(/^#/, '');
    const currentTags = post.tags || [];
    if (!currentTags.includes(tag)) {
      setPost({ ...post, tags: [...currentTags, tag] });
    }
    setNewTag("");
  };

  const currentContent = post[`content_${activeTab}`] || "";
  const charLimit = PLATFORM_LIMITS[activeTab];
  const charCount = currentContent.length;
  
  const getCharCountColor = () => {
    if (activeTab === 'twitter') {
      if (charCount > 280) return 'text-[var(--ember)]';
      if (charCount > 250) return 'text-amber-500';
      return 'text-[var(--green)]';
    }
    return charCount > charLimit ? 'text-[var(--ember)]' : 'text-[var(--text-3)]';
  };

  const isFlashing = activeTab === 'linkedin' ? contentLinkedinFlash
    : activeTab === 'twitter' ? contentTwitterFlash
    : activeTab === 'instagram' ? contentInstagramFlash
    : contentWhatsappFlash;

  return (
    <div className="panel flex flex-col h-full bg-[var(--surface)] overflow-hidden">
      
      {/* ── Toolbar ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-3 bg-[var(--surface-hi)]">
        <div className="flex items-center gap-3">
          {post.post_type && (
            <span className="agent-status-pill border-[rgba(123,97,255,0.35)] text-[var(--violet)] capitalize">
              {post.post_type.replace('_', ' ')}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onSave(post)}
            className="button-ghost"
            style={{ padding: "6px 14px", fontSize: 11, minHeight: 30, gap: 6 }}
          >
            <Save size={12} />
            Save draft
          </button>
          
          <div className="relative">
            <button
              onClick={() => setIsScheduling(!isScheduling)}
              className="button-ghost"
              style={{ padding: "6px 14px", fontSize: 11, minHeight: 30, gap: 6 }}
            >
              <Calendar size={12} />
              Schedule
            </button>
            {isScheduling && (
              <div className="absolute right-0 top-full mt-2 panel p-3 z-10 w-64 shadow-xl">
                <input 
                  type="datetime-local" 
                  className="w-full bg-[var(--background)] border border-[var(--border)] rounded px-2 py-1.5 text-xs text-[var(--text-1)] mb-2"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                />
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      if (scheduleDate) {
                        onSchedule(post, activeTab, scheduleDate);
                        setIsScheduling(false);
                      }
                    }}
                    className="flex-1 bg-[var(--violet)] text-white rounded text-xs py-1.5"
                  >
                    Confirm
                  </button>
                  <button 
                    onClick={() => setIsScheduling(false)}
                    className="flex-1 border border-[var(--border)] text-[var(--text-2)] rounded text-xs py-1.5"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => onPublishNow(post, activeTab)}
            className="flex items-center gap-1.5 bg-[var(--violet)] text-white hover:brightness-110 px-3 py-1.5 rounded transition-all"
            style={{ fontSize: 11, minHeight: 30 }}
          >
            <Send size={12} />
            Publish now
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Main Content Area ─────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col relative">
          
          {/* Platform Tabs */}
          <div className="flex gap-2 border-b border-[var(--border)] mb-6">
            {PLATFORMS.map(platform => (
              <button
                key={platform}
                onClick={() => setActiveTab(platform)}
                className={cn(
                  "px-4 py-2 text-sm font-comfortaa border-b-2 transition-colors",
                  activeTab === platform 
                    ? "border-[var(--violet)] text-[var(--text-1)]" 
                    : "border-transparent text-[var(--text-3)] hover:text-[var(--text-2)]"
                )}
              >
                {PLATFORM_LABELS[platform]}
              </button>
            ))}
          </div>

          {/* Warning */}
          {charCount > charLimit && (
            <div className="mb-4 bg-[rgba(255,107,53,0.1)] text-[var(--ember)] px-3 py-2 rounded text-xs flex items-center gap-2">
              <AlertTriangle size={14} />
              Exceeds {PLATFORM_LABELS[activeTab]} character limit by {charCount - charLimit} characters.
            </div>
          )}

          {/* Platform specific preview */}
          <div className="flex-1 flex justify-center pb-8">
            <div className={cn(
              "w-full max-w-lg transition-colors duration-700 p-2",
              isFlashing ? "bg-[rgba(0,255,136,0.04)] ring-1 ring-[var(--green)] rounded-xl" : ""
            )}>
              
              {activeTab === 'linkedin' && (
                <div className="bg-white dark:bg-[#1d2226] rounded-xl border border-[var(--border)] overflow-hidden shadow-sm">
                  <div className="p-4 flex gap-3">
                     <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 flex-shrink-0" />
                     <div>
                       <div className="font-semibold text-[14px] text-slate-900 dark:text-slate-100 leading-tight">Your Name</div>
                       <div className="text-[12px] text-slate-500 dark:text-slate-400">Founder & CEO</div>
                       <div className="text-[12px] text-slate-500 dark:text-slate-400">Just now · 🌍</div>
                     </div>
                  </div>
                  <div className="px-4 pb-4">
                    <textarea 
                      value={currentContent}
                      onChange={(e) => updateContent(e.target.value)}
                      className="w-full bg-transparent resize-none outline-none text-[14px] text-slate-900 dark:text-slate-100 min-h-[200px]"
                    />
                    {post.tags && post.tags.length > 0 && (
                      <div className="mt-4 text-[14px] text-blue-600 dark:text-blue-400 font-medium">
                        {post.tags.map(t => `#${t}`).join(' ')}
                      </div>
                    )}
                  </div>
                  <div className="px-4 py-2 border-t border-[var(--border)] text-[11px] flex justify-end">
                    <span className={getCharCountColor()}>{charCount} / {charLimit}</span>
                  </div>
                </div>
              )}

              {activeTab === 'twitter' && (
                <div className="bg-white dark:bg-black rounded-xl border border-[var(--border)] p-4 shadow-sm">
                  <div className="flex gap-3 mb-2">
                     <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 flex-shrink-0" />
                     <div className="flex flex-col">
                       <span className="font-bold text-[15px] text-slate-900 dark:text-slate-100 leading-tight">Your Name</span>
                       <span className="text-[15px] text-slate-500">@yourhandle</span>
                     </div>
                  </div>
                  <textarea 
                    value={currentContent}
                    onChange={(e) => updateContent(e.target.value)}
                    className="w-full bg-transparent resize-none outline-none text-[15px] text-slate-900 dark:text-slate-100 min-h-[120px]"
                  />
                  <div className="flex justify-between items-center mt-3 pt-3 border-t border-[var(--border)]">
                    <div className="text-[13px] text-blue-500">{post.tags?.map(t => `#${t}`).join(' ')}</div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors"
                           style={{ borderColor: charCount > 280 ? 'var(--ember)' : charCount > 250 ? '#f59e0b' : 'var(--green)' }}>
                         <span className="text-[8px]" style={{ color: charCount > 280 ? 'var(--ember)' : charCount > 250 ? '#f59e0b' : 'var(--green)' }}>
                           {280 - charCount}
                         </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'instagram' && (
                <div className="bg-white dark:bg-black rounded-xl border border-[var(--border)] shadow-sm overflow-hidden w-[350px] mx-auto">
                  <div className="p-3 flex items-center gap-3 border-b border-[var(--border)]">
                     <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800" />
                     <span className="font-semibold text-[13px] text-slate-900 dark:text-slate-100">yourhandle</span>
                  </div>
                  <div className="w-full aspect-square bg-[var(--surface-hi)] flex items-center justify-center text-[var(--text-3)]">
                    <div className="flex flex-col items-center gap-2">
                      <ImageIcon size={32} />
                      <span className="text-sm">Add image</span>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex gap-2 mb-2 font-semibold text-[13px] text-slate-900 dark:text-slate-100">
                      <span>yourhandle</span>
                    </div>
                    <textarea 
                      value={currentContent}
                      onChange={(e) => updateContent(e.target.value)}
                      className="w-full bg-transparent resize-none outline-none text-[13px] text-slate-900 dark:text-slate-100 min-h-[100px]"
                    />
                    <div className="mt-2 text-[13px] text-blue-900 dark:text-blue-200">
                      {post.tags?.map(t => `#${t}`).join(' ')}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'whatsapp' && (
                <div className="bg-[#e5ddd5] dark:bg-[#0b141a] rounded-xl p-4 shadow-sm w-[350px] mx-auto flex flex-col items-start min-h-[400px]">
                  <div className="bg-[#dcf8c6] dark:bg-[#005c4b] p-3 rounded-2xl rounded-tr-sm max-w-[85%] self-end shadow-sm flex flex-col w-full">
                    <div className="text-right text-[11px] text-[rgba(17,17,17,0.45)] dark:text-[rgba(255,255,255,0.6)] mb-2 font-semibold">
                      Preview
                    </div>
                    <textarea 
                      value={currentContent}
                      onChange={(e) => updateContent(e.target.value)}
                      className="w-full bg-transparent resize-none outline-none text-[14.2px] text-[#111111] dark:text-[#e9edef] min-h-[100px]"
                    />
                  </div>
                </div>
              )}

            </div>
          </div>

        </div>

        {/* ── Right sidebar for tags ─────────────────────────────────────────── */}
        <div className="w-64 border-l border-[var(--border)] bg-[var(--surface-hi)] p-5 flex flex-col overflow-y-auto">
          <p className="system-label mb-3">Hashtags</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {post.tags?.map((tag) => (
              <div key={tag} className="flex items-center gap-1 bg-[var(--background)] border border-[var(--border)] rounded-full px-2.5 py-1 text-xs text-[var(--text-2)]">
                <span>#{tag}</span>
                <button 
                  onClick={() => setPost({ ...post, tags: post.tags?.filter(t => t !== tag)})}
                  className="text-[var(--text-3)] hover:text-[var(--text-1)]"
                >
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input 
               type="text" 
               value={newTag}
               onChange={(e) => setNewTag(e.target.value)}
               onKeyDown={(e) => { if(e.key === 'Enter') handleAddTag() }}
               placeholder="Add hashtag"
               className="flex-1 w-full min-w-0 bg-[var(--background)] border border-[var(--border)] rounded px-2 text-xs h-7 outline-none focus:border-[var(--violet)] transition-colors"
            />
            <button onClick={handleAddTag} className="bg-[var(--surface)] border border-[var(--border)] rounded h-7 w-7 flex-shrink-0 flex items-center justify-center hover:bg-[var(--background)] transition-colors text-[var(--text-2)]">
               <Plus size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PostArtifact;
