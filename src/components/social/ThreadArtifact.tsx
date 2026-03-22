"use client";

import { useState, useEffect } from "react";
import { Loader2, Plus, X, Calendar, Save, AlertTriangle, Edit3, TrendingUp } from "lucide-react";
import LoadingShimmer from "@/components/ui/LoadingShimmer";
import { cn } from "@/lib/utils";

interface ThreadPost {
  order: number;
  content: string;
  char_count: number;
}

interface ThreadData {
  platform: string;
  topic: string;
  posts: ThreadPost[];
  hook_score: number;
}

interface ThreadArtifactProps {
  thread: ThreadData | null;
  isLoading: boolean;
  onSave: (thread: ThreadData) => void;
  onSchedule: (thread: ThreadData, scheduledAt: string) => void;
}

export function ThreadArtifact({
  thread: initialThread,
  isLoading,
  onSave,
  onSchedule
}: ThreadArtifactProps) {
  const [thread, setThread] = useState<ThreadData | null>(initialThread);
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");

  useEffect(() => {
    if (initialThread) setThread(initialThread);
  }, [initialThread]);

  if (isLoading) {
    return (
      <div className="panel flex flex-col gap-0 overflow-hidden anim-fade-in h-full">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <LoadingShimmer className="h-6 w-32 rounded" />
          <div className="flex gap-2">
            <LoadingShimmer className="h-8 w-24 rounded" />
            <LoadingShimmer className="h-8 w-24 rounded" />
          </div>
        </div>
        <div className="p-8 flex flex-col gap-8">
          {[1,2,3].map((i) => (
             <div key={i} className="flex gap-4">
               <LoadingShimmer className="h-8 w-8 rounded-full flex-shrink-0" />
               <div className="flex-1">
                 <LoadingShimmer className="h-4 w-full mb-2" />
                 <LoadingShimmer className="h-4 w-3/4" />
               </div>
             </div>
          ))}
        </div>
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="panel flex h-full flex-col justify-center items-center text-center p-8 bg-[var(--surface-hi)]">
        <div className="flex flex-col items-center max-w-sm">
          <div className="h-12 w-12 rounded-full bg-[rgba(123,97,255,0.1)] flex items-center justify-center mb-4 text-[var(--violet)]">
            <Edit3 size={24} />
          </div>
          <h3 className="font-display text-[18px] text-[var(--text-1)] mb-2">Ask the Social Agent to create a thread</h3>
          <p className="font-mono text-[12px] text-[var(--text-3)] leading-relaxed">
            I can help you build authority with engaging, multi-part threads on LinkedIn and Twitter.
          </p>
        </div>
      </div>
    );
  }

  const updatePost = (index: number, content: string) => {
    const newPosts = [...thread.posts];
    newPosts[index] = { ...newPosts[index], content, char_count: content.length };
    setThread({ ...thread, posts: newPosts });
  };

  const addPost = (index: number) => {
    const newPosts = [...thread.posts];
    newPosts.splice(index + 1, 0, { order: 0, content: "", char_count: 0 });
    newPosts.forEach((p, i) => p.order = i + 1);
    setThread({ ...thread, posts: newPosts });
  };

  const removePost = (index: number) => {
    const newPosts = [...thread.posts];
    newPosts.splice(index, 1);
    newPosts.forEach((p, i) => p.order = i + 1);
    setThread({ ...thread, posts: newPosts });
  };

  const charLimit = thread.platform.toLowerCase() === 'twitter' ? 280 : 3000;

  const hookColor = thread.hook_score >= 8 ? 'text-[var(--green)] border-[rgba(0,255,136,0.2)] bg-[rgba(0,255,136,0.05)]' 
                  : thread.hook_score >= 5 ? 'text-amber-500 border-amber-500/20 bg-amber-500/5' 
                  : 'text-[var(--ember)] border-[rgba(255,107,53,0.2)] bg-[rgba(255,107,53,0.05)]';

  const hookTip = thread.hook_score >= 8 ? "Strong opening — leads with a bold claim." 
                : thread.hook_score >= 5 ? "Decent hook, but could be punchier." 
                : "Weak hook — consider starting with a surprising statistic or question.";

  return (
    <div className="panel flex flex-col h-full bg-[var(--surface)] overflow-hidden">
      
      {/* ── HEADER ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-3 bg-[var(--surface-hi)] z-10">
        <div className="flex items-center gap-3">
          <span className="agent-status-pill border-[rgba(123,97,255,0.35)] text-[var(--violet)] capitalize">
            {thread.platform} Thread
          </span>
          <span className={cn("px-2.5 py-1 rounded text-[11px] font-mono border", hookColor)}>
            Hook: {thread.hook_score}/10
          </span>
          <span className="text-[12px] text-[var(--text-3)] font-mono">
            {thread.posts.length} posts
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onSave(thread)}
            className="button-ghost"
            style={{ padding: "6px 14px", fontSize: 11, minHeight: 30, gap: 6 }}
          >
            <Save size={12} />
            Save thread
          </button>
          
          <div className="relative">
            <button
              onClick={() => setIsScheduling(!isScheduling)}
              className="button-ghost"
              style={{ padding: "6px 14px", fontSize: 11, minHeight: 30, gap: 6 }}
            >
              <Calendar size={12} />
              Schedule all
            </button>
            {isScheduling && (
              <div className="absolute right-0 top-full mt-2 panel p-3 z-20 w-64 shadow-xl">
                <input 
                  type="datetime-local" 
                  className="w-full bg-[var(--background)] border border-[var(--border)] rounded px-2 py-1.5 text-xs text-[var(--text-1)] mb-3 outline-none focus:border-[var(--violet)]"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                />
                <div className="text-[10px] text-[var(--text-3)] mb-3 leading-tight">
                  Posts will be scheduled sequentially starting at this time.
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      if (scheduleDate) {
                        onSchedule(thread, scheduleDate);
                        setIsScheduling(false);
                      }
                    }}
                    className="flex-1 bg-[var(--violet)] text-white hover:brightness-110 rounded text-xs py-1.5 transition-all"
                  >
                    Confirm
                  </button>
                  <button 
                    onClick={() => setIsScheduling(false)}
                    className="flex-1 border border-[var(--border)] text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--surface-hi)] rounded text-xs py-1.5 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── THREAD DISPLAY ── */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-[var(--background)] relative">
        <div className="max-w-2xl mx-auto relative">
          
          {/* Connecting line */}
          <div className="absolute left-[19px] top-6 bottom-6 w-px border-l-2 border-dashed border-[var(--border-hi)] z-0" />

          {thread.posts.map((post, index) => {
            const isOverLimit = post.char_count > charLimit;
            
            return (
              <div key={index} className="relative z-10 mb-6 group">
                <div className="flex gap-4">
                  
                  {/* Number Circle */}
                  <div className="w-10 h-10 rounded-full bg-[var(--surface-hi)] border-2 border-[var(--border)] flex items-center justify-center font-mono text-[13px] font-bold text-[var(--text-2)] flex-shrink-0 mt-2 shadow-sm relative bg-[var(--background)]">
                    {post.order}
                  </div>
                  
                  {/* Post Card */}
                  <div className="flex-1 panel bg-[var(--surface)] border-[var(--border)] transition-colors focus-within:border-[var(--violet)] hover:border-[var(--border-hi)] overflow-hidden shadow-sm relative">
                    
                    {/* Delete button (shows on hover) */}
                    {thread.posts.length > 1 && (
                      <button 
                        onClick={() => removePost(index)}
                        className="absolute right-2 top-2 p-1.5 text-[var(--text-3)] hover:text-[var(--ember)] opacity-0 group-hover:opacity-100 transition-opacity bg-[var(--surface)] rounded-full hover:bg-[rgba(255,107,53,0.1)]"
                      >
                        <X size={14} />
                      </button>
                    )}

                    <div className="p-4 pt-5">
                      <textarea
                        value={post.content}
                        onChange={(e) => updatePost(index, e.target.value)}
                        className="w-full bg-transparent resize-none outline-none text-[14px] text-[var(--text-1)] leading-relaxed min-h-[100px]"
                        placeholder="Write your post here..."
                      />
                    </div>
                    
                    <div className="px-4 py-2 border-t border-[var(--border)] flex items-center justify-between bg-[var(--surface-hi)]">
                      <div className="flex items-center gap-3">
                        {isOverLimit && (
                          <div className="flex items-center gap-1.5 text-[var(--ember)] text-[11px] font-medium">
                            <AlertTriangle size={12} />
                            Over limit
                          </div>
                        )}
                      </div>
                      <span className={cn(
                        "text-[11px] font-mono",
                        isOverLimit ? "text-[var(--ember)]" : "text-[var(--text-3)]"
                      )}>
                        {post.char_count} / {charLimit}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Hook analysis after first post */}
                {index === 0 && (
                  <div className="ml-14 mt-3 mb-2 flex items-start gap-2 p-3 rounded-lg border border-[var(--border)] bg-[var(--surface-hi)]">
                    <TrendingUp size={14} className={cn("mt-0.5", hookColor.split(' ')[0])} />
                    <div>
                      <div className="text-[12px] font-semibold text-[var(--text-1)] mb-0.5">Hook strength: {thread.hook_score}/10</div>
                      <div className="text-[11px] text-[var(--text-2)]">{hookTip}</div>
                    </div>
                  </div>
                )}

                {/* Add post button */}
                <div className="ml-14 mt-4 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity absolute -bottom-5 left-0 right-0 z-20">
                  <button 
                    onClick={() => addPost(index)}
                    className="h-6 w-6 rounded-full bg-[var(--surface-hi)] border border-[var(--border)] text-[var(--text-2)] hover:text-[var(--violet)] hover:border-[var(--violet)] flex items-center justify-center shadow-sm"
                    title="Add post below"
                  >
                    <Plus size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default ThreadArtifact;
