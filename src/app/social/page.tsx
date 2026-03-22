"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Settings, AlertTriangle, X } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase";
import type { SocialArtifactType, SocialPost } from "@/types/social";

import { SocialHomeView } from "@/components/social/SocialHomeView";
import { SocialChatPanel, type SocialChatPanelRef } from "@/components/social/SocialChatPanel";
import { SocialSettingsPanel } from "@/components/social/SocialSettingsPanel";
import { PostArtifact } from "@/components/social/PostArtifact";
import { ThreadArtifact } from "@/components/social/ThreadArtifact";
import { ContentCalendar } from "@/components/social/ContentCalendar";
import AnalyticsDashboard from "@/components/social/AnalyticsDashboard";
import { BrandVoiceTrainer } from "@/components/social/BrandVoiceTrainer";
import { CompetitorMonitor } from "@/components/social/CompetitorMonitor";

import { MockDataBanner } from "@/components/social/MockDataBanner";
import { PomodoroTimer } from "@/components/social/PomodoroTimer";
import { PreviewPostArtifact } from "@/components/social/PreviewPostArtifact";
import { PreviewThreadArtifact } from "@/components/social/PreviewThreadArtifact";
import { PreviewContentCalendar } from "@/components/social/PreviewContentCalendar";
import { PreviewAnalyticsDashboard } from "@/components/social/PreviewAnalyticsDashboard";
import { PreviewBrandVoice } from "@/components/social/PreviewBrandVoice";
import { PreviewCompetitorMonitor } from "@/components/social/PreviewCompetitorMonitor";

export default function SocialSpacePage() {
  const [supabase] = useState(() => createBrowserClient());
  const [userId, setUserId] = useState("");
  const [isPreviewMode, setIsPreviewMode] = useState(true);

  // Artifact State
  const [activeArtifactType, setActiveArtifactType] = useState<SocialArtifactType | null>(null);
  const [activeArtifactData, setActiveArtifactData] = useState<unknown>(null);
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [currentPost, setCurrentPost] = useState<SocialPost | null>(null);
  const [currentThread, setCurrentThread] = useState<any | null>(null);
  
  // Data State
  const [scheduledPosts, setScheduledPosts] = useState<any[]>([]);
  const [calendarSuggestions, setCalendarSuggestions] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any | null>(null);
  const [competitors, setCompetitors] = useState<any[]>([]);
  const [recentPosts, setRecentPosts] = useState<SocialPost[]>([]);
  
  // Settings & Brand Voice State
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<any>({});
  const [brandVoiceAnalysis, setBrandVoiceAnalysis] = useState<any>(null);
  const [isAnalyzingVoice, setIsAnalyzingVoice] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [mobileArtifactOpen, setMobileArtifactOpen] = useState(false);
  const [financeData, setFinanceData] = useState<any | null>(null);

  const chatPanelRef = useRef<SocialChatPanelRef>(null);

  // Auth Hook
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
      }
    });
  }, [supabase]);

  // Initial Fetchers
  const fetchRecentPosts = useCallback(async () => {
    try {
      const res = await fetch("/api/social/posts/save");
      if (res.ok) {
        const data = await res.json();
        setRecentPosts(data.posts || []);
      }
    } catch {}
  }, []);

  const fetchScheduledPosts = useCallback(async () => {
    try {
      const start = new Date();
      const end = new Date();
      end.setDate(end.getDate() + 30);
      const res = await fetch(`/api/social/calendar?startDate=${start.toISOString()}&endDate=${end.toISOString()}`);
      if (res.ok) {
        const data = await res.json();
        setScheduledPosts(data.scheduled || []);
      }
    } catch {}
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/social/settings");
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings || {});
      }
    } catch {}
  }, []);

  const fetchFinanceContext = useCallback(async () => {
    if (!userId || !supabase) return;
    try {
      const { data } = await supabase.from("finance_data_cache").select("*").eq("user_id", userId).single();
      if (data) {
        const mrr_growth_percent = data.mrr > 0 ? (data.net_new_mrr / (data.mrr - data.net_new_mrr)) * 100 : 0;
        setFinanceData({ ...data, mrr_growth_percent });
      }
    } catch (e) {}
  }, [userId, supabase]);

  useEffect(() => {
    if (userId) {
      fetchRecentPosts();
      fetchScheduledPosts();
      fetchSettings();
      fetchFinanceContext();
    }
  }, [userId, fetchRecentPosts, fetchScheduledPosts, fetchSettings, fetchFinanceContext]);

  // Handle Artifact Change
  const handleArtifactChange = useCallback((type: SocialArtifactType, data: unknown) => {
    setActiveArtifactType(type);
    setActiveArtifactData(data);
    setPageError(null);

    switch (type) {
      case 'post':
        if (data && ((data as any).content_linkedin || (data as any).content_twitter || (data as any).platform)) {
           setCurrentPost(data as SocialPost);
           if ((data as any).id) setActivePostId((data as any).id);
        }
        break;
      case 'thread':
        setCurrentThread(data);
        break;
      case 'calendar':
        fetchScheduledPosts();
        break;
      case 'analytics':
        fetch('/api/social/analytics')
          .then(r => r.json())
          .then(data => setAnalytics(data))
          .catch(() => {});
        break;
      case 'brand_voice':
        fetch('/api/social/brand-voice')
          .then(r => r.json())
          .then(data => setBrandVoiceAnalysis(data.analysis))
          .catch(() => {});
        break;
      case 'competitor':
        fetch('/api/social/competitors')
          .then(r => r.json())
          .then(data => setCompetitors(data.competitors || []))
          .catch(() => {});
        break;
      case 'content_ideas':
        setActiveArtifactType(null); // Keep right panel showing Home or neutral state
        break;

    }
  }, [fetchScheduledPosts]);

  const handleQuickAction = useCallback((message: string) => {
    chatPanelRef.current?.sendMessage(message);
    if (isPreviewMode) {
      const p = message.toLowerCase();
      if (p.includes("linkedin post") || p.includes("post about")) {
         setActiveArtifactType("post");
      } else if (p.includes("thread")) {
         setActiveArtifactType("thread");
      } else if (p.includes("schedule") || p.includes("calendar")) {
         setActiveArtifactType("calendar");
      } else if (p.includes("analytics") || p.includes("metrics")) {
         setActiveArtifactType("analytics");
      } else if (p.includes("competitor")) {
         setActiveArtifactType("competitor");
      } else if (p.includes("voice")) {
         setActiveArtifactType("brand_voice");
      }
    }
  }, [isPreviewMode]);

  // Render Right Panel Artifact
  const renderArtifactPanel = () => {
    if (isPreviewMode) {
       switch (activeArtifactType) {
         case 'post': return <PreviewPostArtifact />;
         case 'thread': return <PreviewThreadArtifact />;
         case 'calendar': return <PreviewContentCalendar />;
         case 'analytics': return <PreviewAnalyticsDashboard />;
         case 'brand_voice': return <PreviewBrandVoice />;
         case 'competitor': return <PreviewCompetitorMonitor />;
         default:
           return (
             <SocialHomeView
               onQuickAction={handleQuickAction}
               recentPosts={recentPosts}
               scheduledCount={scheduledPosts.length}
               isConnected={(settings?.linkedin_connected || settings?.twitter_connected) ?? false}
               financeData={financeData}
             />
           );
       }
    }
    
    switch (activeArtifactType) {
      case 'post':
        return (
          <PostArtifact
            post={currentPost}
            isLoading={false}
            onSave={async (post) => {
              try {
                setPageError(null);
                const res = await fetch('/api/social/posts/save', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ post, userId })
                });
                if (!res.ok) throw new Error("Failed to save post");
                const { post: saved } = await res.json();
                setCurrentPost(saved);
                setActivePostId(saved.id);
                fetchRecentPosts();
              } catch (err: any) {
                setPageError(err.message);
              }
            }}
            onSchedule={async (post, platform, scheduledAt) => {
              try {
                setPageError(null);
                const res = await fetch('/api/social/calendar', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ post_id: post?.id || activePostId, platform, scheduled_at: scheduledAt, userId })
                });
                if (!res.ok) throw new Error("Failed to schedule post");
                fetchScheduledPosts();
              } catch (err: any) {
                setPageError(err.message);
              }
            }}
            onPublishNow={async (post, platform) => {
              try {
                setPageError(null);
                const res = await fetch('/api/social/posts/save', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ post: { ...post, status: 'published' }, userId })
                });
                if (!res.ok) throw new Error("Failed to publish post");
                fetchRecentPosts();
                setCurrentPost(prev => prev ? { ...prev, status: 'published' } : null);
              } catch (err: any) {
                setPageError(err.message);
              }
            }}
          />
        );

      case 'thread':
        return (
          <ThreadArtifact
            thread={currentThread}
            isLoading={false}
            onSave={async (posts) => {
               fetchRecentPosts();
            }}
            onSchedule={async (posts, scheduledAt) => {
               fetchScheduledPosts();
            }}
          />
        );

      case 'calendar':
        return (
          <ContentCalendar
            scheduled={scheduledPosts}
            suggestions={calendarSuggestions}
            isLoading={false}
            onSchedulePost={async (post_id, platform, date) => {
               try {
                 await fetch('/api/social/calendar', {
                   method: 'POST',
                   headers: { 'Content-Type': 'application/json' },
                   body: JSON.stringify({ post_id, platform, scheduled_at: date, userId })
                 });
                 fetchScheduledPosts();
               } catch(e) {}
            }}
            onUnschedule={async (id) => {
               try {
                 await fetch('/api/social/calendar', {
                   method: 'DELETE',
                   headers: { 'Content-Type': 'application/json' },
                   body: JSON.stringify({ id, userId })
                 });
                 fetchScheduledPosts();
               } catch(e) {}
            }}
            onCreateFromSuggestion={(suggestion: any) => {
               chatPanelRef.current?.sendMessage(`Create a post based on this idea: ${suggestion.title} - ${suggestion.hook}`);
            }}
            onGetSuggestions={async () => {
               try {
                 const res = await fetch('/api/social/calendar/suggest', {
                   method: 'POST',
                   headers: { 'Content-Type': 'application/json' },
                   body: JSON.stringify({ userId })
                 });
                 const data = await res.json();
                 setCalendarSuggestions(data.suggestions || []);
               } catch (e) {}
            }}
          />
        );

      case 'analytics':
        return (
          <AnalyticsDashboard
            metrics={analytics?.metrics || null}
            brief={analytics?.brief || null}
            isLoading={false}
            onRecordMetrics={async (data) => {
               try {
                 await fetch('/api/social/analytics', {
                   method: 'POST',
                   headers: { 'Content-Type': 'application/json' },
                   body: JSON.stringify({ ...data, userId })
                 });
                 handleArtifactChange('analytics', null); // trigger reload
               } catch(e) {}
            }}
          />
        );

      case 'brand_voice':
        return (
          <BrandVoiceTrainer
            analysis={brandVoiceAnalysis}
            isLoading={false}
            isAnalyzing={isAnalyzingVoice}
            onAnalyze={async (samples) => {
               setIsAnalyzingVoice(true);
               setPageError(null);
               try {
                 const res = await fetch('/api/social/brand-voice', {
                   method: 'POST',
                   headers: { 'Content-Type': 'application/json' },
                   body: JSON.stringify({ samples, userId })
                 });
                 if (!res.ok) throw new Error("Failed to train brand voice");
                 const { analysis } = await res.json();
                 setBrandVoiceAnalysis(analysis);
               } catch (err: any) {
                 setPageError(err.message);
               } finally {
                 setIsAnalyzingVoice(false);
               }
            }}
          />
        );

      case 'competitor':
        return (
          <CompetitorMonitor
            competitors={competitors}
            isLoading={false}
            onAdd={async (comp) => {
              try {
                await fetch('/api/social/competitors', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ ...comp, userId })
                });
                handleArtifactChange('competitor', null); // refresh
              } catch(e) {}
            }}
            onRemove={async (id) => {
              try {
                await fetch('/api/social/competitors', {
                  method: 'DELETE',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ id, userId })
                });
                handleArtifactChange('competitor', null); // refresh
              } catch(e) {}
            }}
            onAnalyze={async () => {
               try {
                 const res = await fetch('/api/social/competitors/analyze', {
                   method: 'POST',
                   headers: { 'Content-Type': 'application/json' },
                   body: JSON.stringify({ userId })
                 });
                 const { analyses } = await res.json();
                 
                 const updated = competitors.map(c => {
                    const match = analyses.find((a: any) => a.competitor_id === c.id);
                    if (match) return { ...c, analysis: match.analysis };
                    return c;
                 });
                 setCompetitors(updated);
               } catch(e) {}
            }}
          />
        );

      default:
        return (
          <SocialHomeView
            onQuickAction={handleQuickAction}
            recentPosts={recentPosts}
            scheduledCount={scheduledPosts.length}
            isConnected={(settings?.linkedin_connected || settings?.twitter_connected) ?? false}
            financeData={financeData}
          />
        );
    }
  };

  return (
    <div className="flex flex-col h-screen bg-black overflow-hidden relative w-full">
      <MockDataBanner 
        isPreviewMode={isPreviewMode} 
        onToggle={() => setIsPreviewMode(false)}
        onConnectReal={() => {
           setIsPreviewMode(false);
           setSettingsOpen(true);
        }}
      />
      
      <div className="flex flex-1 overflow-hidden w-full h-full relative">
      {/* ── Middle Panel: Chat ── */}
      <div
        style={{
          flex: "0 0 420px",
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          margin: "16px 0 16px 16px",
          borderRadius: 16,
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.06)",
          background: "var(--background)",
          position: "relative",
        }}
      >
        {pageError && (
          <div className="mx-4 mt-4 flex items-center justify-between rounded-lg bg-[rgba(239,68,68,0.1)] px-4 py-3 text-[13px] text-[var(--ember)] border border-[rgba(239,68,68,0.2)] z-10">
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} />
              <span>{pageError}</span>
            </div>
            <button onClick={() => setPageError(null)} className="hover:opacity-70"><X size={14} /></button>
          </div>
        )}
        <SocialChatPanel
          ref={chatPanelRef}
          userId={userId}
          onArtifactChange={handleArtifactChange}
          isPreviewMode={isPreviewMode}
          onPreviewExit={() => setIsPreviewMode(false)}
        />
      </div>

      {/* ── Right Panel: Artifact ── */}
      <div
        className="hidden md:flex"
        style={{
          flex: 1,
          flexDirection: "column",
          minWidth: 0,
          margin: "16px 16px 16px 0",
          borderRadius: 16,
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.06)",
          background: "var(--surface)",
          position: "relative",
        }}
      >
        <div className="absolute top-4 right-4 z-[60] flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="flex h-8 w-8 items-center justify-center rounded text-[var(--text-3)] hover:text-[var(--text-1)] transition-colors bg-[var(--surface-hi)] border border-[var(--border)] shadow-sm"
            title="Social Settings"
          >
            <Settings size={16} />
          </button>
        </div>
        
        {renderArtifactPanel()}
      </div>
      </div>

      {isPreviewMode && <PomodoroTimer />}

      {/* ── Mobile: Floating View Doc button ── */}
      {activeArtifactType && (
        <button
          type="button"
          onClick={() => setMobileArtifactOpen(true)}
          className="md:hidden fixed bottom-4 right-4 z-30 rounded bg-[var(--violet)] px-4 py-2.5 text-[13px] font-mono text-white shadow-lg hover:brightness-110 transition-all"
        >
           View Artifact
        </button>
      )}

      {/* ── Mobile: Full-screen overlay ── */}
      {mobileArtifactOpen && (
        <div className="md:hidden fixed inset-0 z-[60] overflow-y-auto bg-[var(--background)]">
          <button
            type="button"
            onClick={() => setMobileArtifactOpen(false)}
            className="fixed top-4 left-4 z-50 text-[var(--text-1)] p-2 bg-[var(--surface)] border border-[var(--border)] rounded-full"
          >
            ✕
          </button>
          <div className="pt-16 pb-8 px-4">{renderArtifactPanel()}</div>
        </div>
      )}

      {/* ── Settings Panel Slide-Over ── */}
      <SocialSettingsPanel
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onSave={async (newSettings) => {
          try {
            setPageError(null);
            const res = await fetch('/api/social/settings', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ settings: newSettings, userId })
            });
            if (!res.ok) throw new Error("Failed to save settings");
            const data = await res.json();
            setSettings(data.settings);
          } catch(e: any) {
             setPageError(e.message);
          }
        }}
        onRetrainVoice={() => {
           setSettingsOpen(false);
           handleQuickAction("I want to re-train my brand voice.");
        }}
      />
    </div>
  );
}
