"use client";

import { useState } from "react";
import { format, addDays, startOfWeek, subWeeks, addWeeks, isSameDay } from "date-fns";
import { ChevronLeft, ChevronRight, X, Sparkles, Plus, Calendar } from "lucide-react";
import LoadingShimmer from "@/components/ui/LoadingShimmer";
import { cn } from "@/lib/utils";
import type { SocialPlatform } from "@/types/social";

interface ScheduledPost {
  id: string;
  post_id: string;
  platform: SocialPlatform;
  scheduled_at: string;
  status: string;
  content_preview: string;
}

interface Suggestion {
  day: string;
  platform: string;
  post_type: string;
  title: string;
  hook: string;
  why_now: string;
}

interface ContentCalendarProps {
  scheduled: ScheduledPost[];
  suggestions: Suggestion[];
  isLoading: boolean;
  onSchedulePost: (postId: string, platform: string, date: string) => void;
  onUnschedule: (scheduledId: string) => void;
  onCreateFromSuggestion: (suggestion: Suggestion) => void;
  onGetSuggestions: () => void;
}

const PLATFORM_COLORS = {
  linkedin: "text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-900/20 dark:border-blue-800",
  twitter: "text-neutral-800 bg-neutral-100 border-neutral-200 dark:text-neutral-200 dark:bg-neutral-800 dark:border-neutral-700",
  instagram: "text-pink-600 bg-pink-50 border-pink-200 dark:text-pink-400 dark:bg-pink-900/20 dark:border-pink-800",
  whatsapp: "text-green-600 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-900/20 dark:border-green-800",
};

export function ContentCalendar({
  scheduled = [],
  suggestions = [],
  isLoading,
  onSchedulePost,
  onUnschedule,
  onCreateFromSuggestion,
  onGetSuggestions
}: ContentCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));

  const handlePrevWeek = () => setCurrentDate(subWeeks(currentDate, 1));
  const handleNextWeek = () => setCurrentDate(addWeeks(currentDate, 1));

  if (isLoading) {
    return (
      <div className="panel flex flex-col h-full overflow-hidden p-6 gap-6">
        <div className="flex justify-between items-center mb-4">
          <LoadingShimmer className="h-6 w-48 rounded" />
          <LoadingShimmer className="h-8 w-64 rounded" />
        </div>
        <div className="grid grid-cols-7 gap-4 flex-1">
          {[1,2,3,4,5,6,7].map(i => (
             <div key={i} className="flex flex-col gap-3">
               <LoadingShimmer className="h-8 w-full rounded" />
               <LoadingShimmer className="h-24 w-full rounded" />
               {i % 2 === 0 && <LoadingShimmer className="h-24 w-full rounded" />}
             </div>
          ))}
        </div>
        <div className="h-32 mt-4 bg-[var(--surface-hi)] rounded-xl border border-[var(--border)] p-4">
           <LoadingShimmer className="h-4 w-48 mb-4" />
           <div className="flex gap-4">
             {[1,2,3].map(i => <LoadingShimmer key={i} className="h-16 w-64 rounded" />)}
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="panel flex flex-col h-full bg-[var(--background)] overflow-hidden">
      
      {/* ── TOOLBAR ── */}
      <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4 bg-[var(--surface)]">
        <div className="flex items-center gap-3">
          <h2 className="font-display text-[16px] text-[var(--text-1)]">Content Calendar</h2>
          <span className="text-[12px] text-[var(--text-3)] font-mono bg-[var(--surface-hi)] px-2 py-0.5 rounded">
            Week of {format(weekStart, 'MMM d, yyyy')}
          </span>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 bg-[var(--surface-hi)] rounded-lg p-1 border border-[var(--border)]">
            <button onClick={handlePrevWeek} className="p-1 text-[var(--text-2)] hover:text-[var(--text-1)] rounded hover:bg-[var(--surface)] transition-colors">
              <ChevronLeft size={16} />
            </button>
            <button onClick={handleNextWeek} className="p-1 text-[var(--text-2)] hover:text-[var(--text-1)] rounded hover:bg-[var(--surface)] transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>
          
          <button
            onClick={onGetSuggestions}
            className="flex items-center gap-2 rounded-full border border-[rgba(123,97,255,0.3)] bg-[rgba(123,97,255,0.05)] px-4 py-1.5 hover:bg-[rgba(123,97,255,0.1)] transition-colors group text-[var(--violet)]"
          >
            <Sparkles size={14} />
            <span className="font-mono text-[11px] font-medium">Get AI suggestions</span>
          </button>
        </div>
      </div>

      {/* ── WEEKLY GRID ── */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col relative">
        <div className="grid grid-cols-7 gap-4 min-h-[300px] flex-1">
          {weekDays.map((day, idx) => {
            const dayPosts = scheduled.filter(p => isSameDay(new Date(p.scheduled_at), day));
            const isToday = isSameDay(day, new Date());
            
            return (
              <div key={idx} className="flex flex-col gap-3 min-w-[140px]">
                <div className={cn(
                  "text-center py-2.5 rounded-lg border",
                  isToday 
                    ? "bg-[rgba(123,97,255,0.1)] border-[rgba(123,97,255,0.3)] text-[var(--violet)]" 
                    : "bg-[var(--surface)] border-[var(--border)] text-[var(--text-2)]"
                )}>
                  <div className="font-medium text-[13px]">{format(day, 'EEE')}</div>
                  <div className="font-mono text-[11px] opacity-70 mt-0.5">{format(day, 'MMM d')}</div>
                </div>

                <div className="flex flex-col gap-2 flex-1">
                  {dayPosts.map(post => (
                    <div key={post.id} className="panel p-3 bg-[var(--surface)] border-[var(--border)] hover:border-[var(--border-hi)] transition-colors relative group shadow-sm z-10">
                      <button 
                        onClick={() => onUnschedule(post.id)}
                        className="absolute right-2 top-2 text-[var(--text-3)] hover:text-[var(--ember)] opacity-0 group-hover:opacity-100 transition-opacity bg-[var(--surface)] rounded-full p-0.5"
                        title="Unschedule"
                      >
                        <X size={12} />
                      </button>
                      
                      <div className={cn(
                        "inline-block px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider mb-2 border",
                        PLATFORM_COLORS[post.platform] || PLATFORM_COLORS.linkedin
                      )}>
                        {post.platform}
                      </div>
                      
                      <p className="text-[12px] text-[var(--text-1)] leading-snug mb-3 line-clamp-3">
                        {post.content_preview}
                      </p>
                      
                      <div className="text-[10px] text-[var(--text-3)] font-mono flex items-center justify-between border-t border-[var(--border)] pt-2 mt-auto">
                        <span>{format(new Date(post.scheduled_at), 'h:mm a')}</span>
                        {post.status === 'published' && <span className="text-[var(--green)]">Live</span>}
                      </div>
                    </div>
                  ))}

                  {/* Empty slot standard visual */}
                  <div className="panel p-3 border-2 border-dashed border-[var(--border-hi)] bg-transparent hover:bg-[var(--surface)] hover:border-[var(--violet)] hover:text-[var(--violet)] text-[var(--text-3)] transition-all cursor-pointer flex flex-col items-center justify-center min-h-[80px] group rounded-xl z-10"
                       onClick={() => { /* Could open a generic create post modal */ }}>
                    <Plus size={16} className="mb-1 opacity-50 group-hover:opacity-100 transition-opacity" />
                    <span className="text-[11px] font-medium opacity-70 group-hover:opacity-100 transition-opacity">Schedule</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── AI SUGGESTIONS ROW ── */}
        {suggestions && suggestions.length > 0 && (
          <div className="mt-8 pt-6 border-t border-[var(--border)] z-10">
            <h3 className="font-display text-[14px] text-[var(--text-1)] mb-4 flex items-center gap-2">
              <Sparkles size={14} className="text-[var(--violet)]" />
              AI suggested posts for this week
            </h3>
            
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin">
              {suggestions.map((sug, i) => (
                <div key={i} className="panel min-w-[280px] max-w-[280px] p-4 bg-[var(--surface)] border-[var(--border)] flex flex-col hover:border-[var(--violet)] transition-colors group relative overflow-hidden">
                  
                  <div className="flex items-center gap-2 mb-3 z-10">
                    <span className="text-[10px] font-mono bg-[var(--surface-hi)] px-1.5 py-0.5 rounded text-[var(--text-2)]">{sug.day}</span>
                    <span className={cn(
                        "text-[9px] font-mono uppercase px-1.5 py-0.5 rounded border",
                        PLATFORM_COLORS[sug.platform as SocialPlatform] || PLATFORM_COLORS.linkedin
                      )}>
                      {sug.platform}
                    </span>
                    <span className="text-[9px] font-mono uppercase bg-[var(--surface-hi)] px-1.5 py-0.5 rounded text-[var(--text-3)] truncate capitalize">
                      {sug.post_type.replace('_', ' ')}
                    </span>
                  </div>
                  
                  <h4 className="text-[13px] font-semibold text-[var(--text-1)] mb-2 leading-tight z-10">{sug.title}</h4>
                  
                  <p className="text-[12px] text-[var(--text-2)] italic line-clamp-2 mb-3 leading-relaxed z-10 border-l-2 border-[var(--border-hi)] pl-2">
                    "{sug.hook}"
                  </p>
                  
                  <div className="mt-auto pt-3 border-t border-[var(--border)] z-10">
                     <p className="text-[10px] text-[var(--text-3)] leading-snug mb-3">
                       <span className="font-semibold text-[var(--text-2)]">Why now:</span> {sug.why_now}
                     </p>
                     <button 
                       onClick={() => onCreateFromSuggestion(sug)}
                       className="w-full text-center text-[11px] font-medium text-[var(--violet)] bg-[rgba(123,97,255,0.05)] hover:bg-[rgba(123,97,255,0.1)] py-1.5 rounded transition-colors"
                     >
                       Create this post ↗
                     </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state when strictly 0 scheduled posts */}
        {scheduled.length === 0 && (!suggestions || suggestions.length === 0) && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
             <div className="text-center panel p-6 pointer-events-auto shadow-xl bg-[var(--surface)] border-[var(--border)]">
                <Calendar size={28} className="mx-auto mb-3 text-[var(--violet)] opacity-80" />
                <h3 className="text-[15px] font-medium text-[var(--text-1)] mb-1">No posts scheduled this week</h3>
                <p className="text-[12px] text-[var(--text-3)] mb-5 max-w-xs mx-auto leading-relaxed">Keep your social presence active. Generate content with the Social Agent or ask for AI suggestions.</p>
                <button
                  onClick={onGetSuggestions}
                  className="flex mx-auto items-center gap-2 rounded-full border border-[var(--violet)] bg-[var(--violet)] text-white px-5 py-2 hover:brightness-110 transition-colors shadow-lg shadow-[rgba(123,97,255,0.2)]"
                >
                  <Sparkles size={14} />
                  <span className="font-mono text-[12px] font-medium">Get AI suggestions</span>
                </button>
             </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default ContentCalendar;
