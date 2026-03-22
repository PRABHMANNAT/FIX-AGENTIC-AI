"use client";

import { MessageSquareText, TrendingUp, Presentation, Megaphone, Repeat, Lightbulb, Users, BarChart3, ArrowRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { SocialPost } from "@/types/social";
import { cn } from "@/lib/utils";

interface SocialHomeViewProps {
  onQuickAction: (message: string) => void;
  recentPosts: SocialPost[];
  scheduledCount: number;
  isConnected: boolean;
  financeData?: any;
}

const QUICK_ACTIONS = [
  {
    id: "linkedin", label: "LinkedIn Post", subtext: "Write a professional post",
    icon: Presentation, action: "Write me a LinkedIn post about what I'm currently building", hex: "#0077b5"
  },
  {
    id: "twitter", label: "Twitter Thread", subtext: "Create a viral thread",
    icon: Megaphone, action: "Create a 5-tweet thread about my founder journey", hex: "#1DA1F2"
  },
  {
    id: "repurpose", label: "Repurpose Content", subtext: "Turn one post into many",
    icon: Repeat, action: "Help me repurpose content for multiple platforms", hex: "#F472B6"
  },
  {
    id: "ideas", label: "Content Ideas", subtext: "Get 5 post ideas for this week",
    icon: Lightbulb, action: "Give me 5 content ideas for this week based on my business", hex: "#FBBF24"
  },
  {
    id: "voice", label: "Brand Voice", subtext: "Train AI on your style",
    icon: MessageSquareText, action: "Help me train my brand voice", hex: "#A78BFA"
  },
  {
    id: "calendar", label: "Content Calendar", subtext: "Plan your week",
    icon: TrendingUp, action: "Show me my content calendar", hex: "#2DD4BF"
  },
  {
    id: "analytics", label: "Analytics", subtext: "See what's working",
    icon: BarChart3, action: "Show me my social media analytics", hex: "#34D399"
  },
  {
    id: "intel", label: "Competitor Intel", subtext: "Track competitor content",
    icon: Users, action: "Show me competitor content analysis", hex: "#F87171"
  }
];

export function SocialHomeView({
  onQuickAction,
  recentPosts = [],
  scheduledCount,
  isConnected,
  financeData
}: SocialHomeViewProps) {

  return (
    <div className="panel flex flex-col h-full bg-[var(--surface)] overflow-hidden">
      <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-10">
        
        {/* Finance Triggered Suggestions */}
        {financeData && (
          <div className="space-y-4">
            <h3 className="font-display text-[16px] text-[var(--text-1)] flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[var(--green)]"></span>
              Business Milestone Suggestions
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {financeData.net_new_mrr > 0 && (
                <div className="bg-[rgba(16,185,129,0.05)] border border-[rgba(16,185,129,0.2)] rounded-xl p-5 flex flex-col justify-between shadow-sm">
                  <div>
                    <h4 className="font-semibold text-[14px] text-[var(--text-1)] mb-1">Revenue Milestone</h4>
                    <p className="text-[13px] text-[var(--text-2)] mb-4">You added ₹{financeData.net_new_mrr} in new MRR — founders love these updates.</p>
                  </div>
                  <button 
                    onClick={() => onQuickAction(`Write a post. We just added ₹${financeData.net_new_mrr} in new monthly recurring revenue this month!`)}
                    className="self-start text-[12px] font-medium bg-[var(--surface-hi)] text-[var(--text-1)] border border-[var(--border)] px-4 py-1.5 rounded-lg hover:bg-[var(--surface)] transition-colors"
                  >
                    Write this post
                  </button>
                </div>
              )}
              {financeData.mrr_growth_percent > 10 && (
                <div className="bg-[rgba(123,97,255,0.05)] border border-[rgba(123,97,255,0.2)] rounded-xl p-5 flex flex-col justify-between shadow-sm">
                  <div>
                    <h4 className="font-semibold text-[14px] text-[var(--text-1)] mb-1">Rapid Growth</h4>
                    <p className="text-[13px] text-[var(--text-2)] mb-4">Your MRR grew {financeData.mrr_growth_percent.toFixed(1)}% — share the milestone?</p>
                  </div>
                  <button 
                    onClick={() => onQuickAction(`Write a post about hitting a huge milestone: our MRR grew by ${financeData.mrr_growth_percent.toFixed(1)}% this month.`)}
                    className="self-start text-[12px] font-medium bg-[var(--surface-hi)] text-[var(--text-1)] border border-[var(--border)] px-4 py-1.5 rounded-lg hover:bg-[var(--surface)] transition-colors"
                  >
                    Write this post
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Welcome Section */}
        <div>
          <h2 className="font-display text-[22px] text-[var(--text-1)] mb-2">Social Agent</h2>
          <p className="text-[14px] text-[var(--text-3)] max-w-2xl leading-relaxed">
            Your AI social media manager. I can help you write posts, grow your audience, keep an eye on competitors, and schedule content.
          </p>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {QUICK_ACTIONS.map((action) => (
             <button
                key={action.id}
                onClick={() => onQuickAction(action.action)}
                className="flex flex-col text-left p-5 border border-[var(--border)] rounded-xl bg-[var(--surface-hi)] hover:border-[var(--violet)] transition-all shadow-sm group hover:shadow-md"
             >
                <div className="w-10 h-10 rounded-full flex items-center justify-center mb-4 transition-colors"
                     style={{ background: `${action.hex}15`, color: action.hex }}>
                   <action.icon size={18} />
                </div>
                <div className="font-semibold text-[14px] text-[var(--text-1)] mb-1 group-hover:text-[var(--violet)] transition-colors">{action.label}</div>
                <div className="text-[12px] text-[var(--text-3)]">{action.subtext}</div>
             </button>
          ))}
        </div>

        {/* Connect Platforms Section */}
        {!isConnected && (
           <div className="bg-[rgba(123,97,255,0.05)] border border-[rgba(123,97,255,0.2)] rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
             <div>
                <h3 className="font-semibold text-[15px] text-[var(--text-1)] mb-1">Connect LinkedIn or Twitter to publish directly</h3>
                <p className="text-[13px] text-[var(--text-2)]">To automatically schedule and publish, connect your accounts.</p>
             </div>
             <div className="flex items-center gap-3 shrink-0">
                <button className="text-[13px] font-medium bg-[#0077b5] text-white px-5 py-2 rounded-lg hover:brightness-110 transition-all shadow-sm">Connect LinkedIn</button>
                <button className="text-[13px] font-medium bg-black dark:bg-white text-white dark:text-black px-5 py-2 rounded-lg hover:opacity-80 transition-all shadow-sm">Connect Twitter</button>
             </div>
           </div>
        )}

        {/* Recent Posts Section */}
        {recentPosts && recentPosts.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
               <h3 className="font-display text-[16px] text-[var(--text-1)]">Recent drafts</h3>
            </div>
            <div className="space-y-3">
              {recentPosts.slice(0, 3).map((post) => {
                 let contentPreview = post.content_linkedin || post.content_twitter || post.content_instagram || '';
                 if (post.post_type === 'thread' && contentPreview.startsWith('{')) {
                    try {
                      const t = JSON.parse(contentPreview);
                      contentPreview = t.posts?.[0]?.content || '';
                    } catch(e) {}
                 }
                 
                 return (
                    <button
                      key={post.id}
                      onClick={() => onQuickAction(`Open draft: ${post.id}`)}
                      className="w-full flex items-center justify-between p-4 bg-[var(--surface-hi)] border border-[var(--border)] rounded-xl hover:border-[var(--violet)] transition-colors group cursor-pointer shadow-sm text-left"
                    >
                       <div className="flex items-center gap-4 flex-1 min-w-0">
                          <span className="text-[10px] uppercase font-mono tracking-wider bg-[var(--background)] px-2 py-0.5 rounded border border-[var(--border)] text-[var(--text-2)] flex-shrink-0">
                            {post.platform}
                          </span>
                          <span className="text-[13px] text-[var(--text-1)] truncate flex-1 leading-snug">
                            {contentPreview.substring(0, 60) || 'Empty draft'}...
                          </span>
                       </div>
                       <div className="flex items-center gap-4 shrink-0 pl-4">
                          <span className={cn(
                            "text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 rounded",
                            post.status === 'published' ? "bg-[rgba(0,255,136,0.1)] text-[var(--green)]" :
                            post.status === 'scheduled' ? "bg-[rgba(123,97,255,0.1)] text-[var(--violet)]" :
                            "bg-[var(--surface)] text-[var(--text-3)]"
                          )}>
                            {post.status}
                          </span>
                          <span className="text-[12px] text-[var(--text-3)] w-24 text-right">
                             {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                          </span>
                          <ArrowRight size={14} className="text-[var(--text-3)] group-hover:text-[var(--violet)] transition-colors group-hover:translate-x-1" />
                       </div>
                    </button>
                 );
              })}
            </div>
          </div>
        )}
        
      </div>
    </div>
  );
}
