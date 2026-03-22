"use client";

import { useState } from "react";
import { BarChart3, TrendingUp, TrendingDown, Info, Zap, DownloadCloud, Activity, Users } from "lucide-react";
import LoadingShimmer from "@/components/ui/LoadingShimmer";
import { cn } from "@/lib/utils";

interface AnalyticsMetrics {
  total_impressions: number;
  total_likes: number;
  total_shares: number;
  avg_engagement_rate: number;
  best_performing_platform: string;
  follower_growth_total: number;
  posts_published: number;
}

interface AnalyticsBrief {
  top_win: string;
  top_opportunity: string;
  change_this_week: string;
  one_line_summary: string;
}

interface AnalyticsDashboardProps {
  metrics: AnalyticsMetrics | null;
  brief: AnalyticsBrief | null;
  isLoading: boolean;
  onRecordMetrics: (data: any) => void;
}

const PLATFORMS = ["linkedin", "twitter", "instagram", "whatsapp"];

export function AnalyticsDashboard({
  metrics,
  brief,
  isLoading,
  onRecordMetrics
}: AnalyticsDashboardProps) {
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [formData, setFormData] = useState({
    platform: "linkedin", impressions: 0, likes: 0, comments: 0, shares: 0, followers_gained: 0
  });

  if (isLoading) {
    return (
      <div className="panel p-6 h-full flex flex-col gap-6 bg-[var(--surface)]">
         <LoadingShimmer className="h-6 w-48 mb-4" />
         <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <LoadingShimmer key={i} className="h-24 w-full rounded-xl" />)}
         </div>
         <LoadingShimmer className="h-32 w-full mt-4 rounded-xl" />
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
            {[1,2,3].map(i => <LoadingShimmer key={i} className="h-40 w-full rounded-xl" />)}
         </div>
      </div>
    );
  }

  if (!metrics) {
    return (
       <div className="panel flex h-full flex-col justify-center items-center text-center p-8 bg-[var(--surface-hi)] overflow-y-auto">
        <div className="flex flex-col items-center max-w-sm">
          <div className="h-12 w-12 rounded-full bg-[rgba(123,97,255,0.1)] flex items-center justify-center mb-4 text-[var(--violet)]">
            <BarChart3 size={24} />
          </div>
          <h3 className="font-display text-[18px] text-[var(--text-1)] mb-2">No analytics yet</h3>
          <p className="font-mono text-[12px] text-[var(--text-3)] leading-relaxed mb-6">
            Connect LinkedIn or Twitter to track performance automatically, or record your metrics manually.
          </p>
          <button 
             onClick={() => setShowManualEntry(!showManualEntry)}
             className="bg-[var(--surface)] border border-[var(--border)] text-[var(--text-1)] px-5 py-2.5 rounded-lg text-[13px] font-medium hover:border-[var(--violet)] hover:text-[var(--violet)] transition-colors shadow-sm"
          >
             Record metrics manually
          </button>
          
          {showManualEntry && (
             <div className="mt-6 w-full text-left bg-[var(--surface)] border border-[var(--violet)] p-5 rounded-xl shadow-md border-opacity-50 animate-in fade-in slide-in-from-top-2">
                <div className="grid grid-cols-2 gap-4 mb-5">
                  <div>
                    <label className="block text-[11px] font-mono text-[var(--text-2)] mb-1 uppercase tracking-widest">Platform</label>
                    <select 
                      className="w-full bg-[var(--background)] border border-[var(--border)] rounded-md px-3 py-2 text-[13px] text-[var(--text-1)] outline-none focus:border-[var(--violet)]"
                      value={formData.platform}
                      onChange={e => setFormData({...formData, platform: e.target.value})}
                    >
                      {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-[var(--text-2)] mb-1 uppercase tracking-widest">Impressions</label>
                    <input type="number" className="w-full bg-[var(--background)] border border-[var(--border)] rounded-md px-3 py-2 text-[13px] text-[var(--text-1)] outline-none focus:border-[var(--violet)]"
                           value={formData.impressions} onChange={e => setFormData({...formData, impressions: parseInt(e.target.value) || 0})} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-[var(--text-2)] mb-1 uppercase tracking-widest">Likes</label>
                    <input type="number" className="w-full bg-[var(--background)] border border-[var(--border)] rounded-md px-3 py-2 text-[13px] text-[var(--text-1)] outline-none focus:border-[var(--violet)]"
                           value={formData.likes} onChange={e => setFormData({...formData, likes: parseInt(e.target.value) || 0})} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-[var(--text-2)] mb-1 uppercase tracking-widest">Comments</label>
                    <input type="number" className="w-full bg-[var(--background)] border border-[var(--border)] rounded-md px-3 py-2 text-[13px] text-[var(--text-1)] outline-none focus:border-[var(--violet)]"
                           value={formData.comments} onChange={e => setFormData({...formData, comments: parseInt(e.target.value) || 0})} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-[var(--text-2)] mb-1 uppercase tracking-widest">Shares</label>
                    <input type="number" className="w-full bg-[var(--background)] border border-[var(--border)] rounded-md px-3 py-2 text-[13px] text-[var(--text-1)] outline-none focus:border-[var(--violet)]"
                           value={formData.shares} onChange={e => setFormData({...formData, shares: parseInt(e.target.value) || 0})} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-[var(--text-2)] mb-1 uppercase tracking-widest">Growth (Followers)</label>
                    <input type="number" className="w-full bg-[var(--background)] border border-[var(--border)] rounded-md px-3 py-2 text-[13px] text-[var(--text-1)] outline-none focus:border-[var(--violet)]"
                           value={formData.followers_gained} onChange={e => setFormData({...formData, followers_gained: parseInt(e.target.value) || 0})} />
                  </div>
                </div>
                <div className="flex gap-3 justify-end pt-2 border-t border-[var(--border)]">
                   <button onClick={() => setShowManualEntry(false)} className="px-4 py-1.5 text-[12px] font-medium text-[var(--text-2)] hover:text-[var(--text-1)] transition-colors">Cancel</button>
                   <button
                     onClick={() => {
                       onRecordMetrics(formData);
                       setShowManualEntry(false);
                     }}
                     className="bg-[var(--violet)] text-white px-5 py-1.5 rounded-lg text-[12px] font-medium transition-all shadow-sm hover:brightness-110"
                   >Save Metrics</button>
                </div>
             </div>
          )}
        </div>
      </div>
    )
  }

  // Displaying actual dashboard
  return (
    <div className="panel flex flex-col h-full bg-[var(--surface)] overflow-hidden">
       <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8">
          
          {/* SECTION 1 - Brief */}
          {brief && (
            <div className="space-y-6">
               <h2 className="font-display text-[20px] text-[var(--text-1)] border-b border-[var(--border)] pb-4">{brief.one_line_summary}</h2>
               
               <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                 <div className="bg-[rgba(0,255,136,0.03)] border border-[rgba(0,255,136,0.2)] rounded-xl p-5 shadow-sm">
                   <h4 className="text-[13px] font-semibold text-[var(--green)] mb-3 flex items-center gap-2">
                     <TrendingUp size={16} /> Top Win
                   </h4>
                   <p className="text-[13px] text-[var(--text-1)] leading-relaxed">{brief.top_win}</p>
                 </div>
                 
                 <div className="bg-[rgba(123,97,255,0.03)] border border-[rgba(123,97,255,0.2)] rounded-xl p-5 shadow-sm">
                   <h4 className="text-[13px] font-semibold text-[var(--violet)] mb-3 flex items-center gap-2">
                     <Zap size={16} /> Top Opportunity
                   </h4>
                   <p className="text-[13px] text-[var(--text-1)] leading-relaxed">{brief.top_opportunity}</p>
                 </div>
                 
                 <div className="bg-[rgba(255,107,53,0.03)] border border-[rgba(255,107,53,0.2)] rounded-xl p-5 shadow-sm">
                   <h4 className="text-[13px] font-semibold text-[var(--ember)] mb-3 flex items-center gap-2">
                     <AlertTriangle size={16} /> Change This Week
                   </h4>
                   <p className="text-[13px] text-[var(--text-1)] leading-relaxed">{brief.change_this_week}</p>
                 </div>
               </div>
            </div>
          )}

          {/* SECTION 2 - Metrics */}
          <div>
            <h3 className="text-[11px] font-mono uppercase tracking-widest text-[var(--text-3)] mb-4">Key Metrics (30d)</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard title="Total Impressions" value={metrics.total_impressions.toLocaleString()} icon={<Activity size={16} />} />
              <MetricCard title="Likes & Shares" value={(metrics.total_likes + metrics.total_shares).toLocaleString()} icon={<BarChart3 size={16} />} />
              <MetricCard title="Engagement Rate" value={`${metrics.avg_engagement_rate.toFixed(1)}%`} icon={<Zap size={16} />} />
              <MetricCard title="Follower Growth" value={`+${metrics.follower_growth_total}`} icon={<Users size={16} />} />
            </div>
          </div>

          {/* SECTION 3 - Best platform */}
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1 bg-[var(--surface-hi)] border border-[var(--border)] rounded-xl p-6 flex items-center justify-between shadow-sm relative overflow-hidden">
               <div className="absolute -right-6 -bottom-6 opacity-[0.03] pointer-events-none">
                 <BarChart3 size={120} />
               </div>
               <div className="z-10">
                  <div className="text-[11px] font-mono uppercase tracking-widest text-[var(--text-3)] mb-1.5">Your best platform</div>
                  <div className="text-[24px] font-semibold text-[var(--text-1)] capitalize">{metrics.best_performing_platform}</div>
               </div>
               <div className="text-right z-10">
                  <div className="text-[13px] text-[var(--text-2)] mb-1">Focus more content here</div>
                  <div className="text-[11px] text-[var(--green)] flex items-center justify-end gap-1 font-mono tracking-wide"><TrendingUp size={12} /> Highest engagement</div>
               </div>
            </div>
            
            <div className="flex-1 flex flex-col justify-center items-start border border-dashed border-[var(--border-hi)] rounded-xl p-6 hover:border-[var(--violet)] transition-colors group">
               <div className="text-[13px] text-[var(--text-1)] font-medium mb-1 group-hover:text-[var(--violet)] transition-colors">Need to update metrics?</div>
               <div className="text-[12px] text-[var(--text-3)] mb-4">Record this week's numbers.</div>
               <button 
                 onClick={() => setShowManualEntry(!showManualEntry)}
                 className="text-[12px] bg-[var(--surface)] font-medium border border-[var(--border)] px-4 py-2 rounded-lg text-[var(--text-1)] hover:text-[var(--violet)] hover:border-[var(--violet)] transition-colors shadow-sm"
               >Record this week's metrics</button>
            </div>
          </div>
          
          {/* SEC 4 MANUAL ENTRY inline */}
          {showManualEntry && (
             <div className="bg-[var(--surface-hi)] border border-[var(--violet)] p-6 rounded-xl shadow-md border-opacity-50 animate-in slide-in-from-top-2">
                <div className="font-semibold text-[14px] text-[var(--text-1)] mb-5">Manual Entry</div>
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
                  <div>
                    <label className="block text-[11px] font-mono text-[var(--text-2)] mb-1.5 uppercase tracking-widest">Platform</label>
                    <select className="w-full bg-[var(--background)] border border-[var(--border)] rounded-md px-3 py-2 text-[13px] text-[var(--text-1)] outline-none focus:border-[var(--violet)] transition-colors"
                      value={formData.platform} onChange={e => setFormData({...formData, platform: e.target.value})}>
                      {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-[var(--text-2)] mb-1.5 uppercase tracking-widest">Impressions</label>
                    <input type="number" className="w-full bg-[var(--background)] border border-[var(--border)] rounded-md px-3 py-2 text-[13px] text-[var(--text-1)] outline-none focus:border-[var(--violet)] transition-colors"
                           value={formData.impressions} onChange={e => setFormData({...formData, impressions: parseInt(e.target.value) || 0})} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-[var(--text-2)] mb-1.5 uppercase tracking-widest">Likes</label>
                    <input type="number" className="w-full bg-[var(--background)] border border-[var(--border)] rounded-md px-3 py-2 text-[13px] text-[var(--text-1)] outline-none focus:border-[var(--violet)] transition-colors"
                           value={formData.likes} onChange={e => setFormData({...formData, likes: parseInt(e.target.value) || 0})} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-[var(--text-2)] mb-1.5 uppercase tracking-widest">Comments</label>
                    <input type="number" className="w-full bg-[var(--background)] border border-[var(--border)] rounded-md px-3 py-2 text-[13px] text-[var(--text-1)] outline-none focus:border-[var(--violet)] transition-colors"
                           value={formData.comments} onChange={e => setFormData({...formData, comments: parseInt(e.target.value) || 0})} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-[var(--text-2)] mb-1.5 uppercase tracking-widest">Shares</label>
                    <input type="number" className="w-full bg-[var(--background)] border border-[var(--border)] rounded-md px-3 py-2 text-[13px] text-[var(--text-1)] outline-none focus:border-[var(--violet)] transition-colors"
                           value={formData.shares} onChange={e => setFormData({...formData, shares: parseInt(e.target.value) || 0})} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-[var(--text-2)] mb-1.5 uppercase tracking-widest">Growth</label>
                    <input type="number" className="w-full bg-[var(--background)] border border-[var(--border)] rounded-md px-3 py-2 text-[13px] text-[var(--text-1)] outline-none focus:border-[var(--violet)] transition-colors"
                           value={formData.followers_gained} onChange={e => setFormData({...formData, followers_gained: parseInt(e.target.value) || 0})} />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
                   <button onClick={() => setShowManualEntry(false)} className="px-5 py-2 text-[12px] font-medium text-[var(--text-2)] hover:text-[var(--text-1)] transition-colors border border-transparent hover:bg-[var(--surface)] rounded-lg">Cancel</button>
                   <button
                     onClick={() => {
                       onRecordMetrics(formData);
                       setShowManualEntry(false);
                     }}
                     className="bg-[var(--violet)] text-white px-6 py-2 rounded-lg text-[13px] font-medium shadow-sm hover:brightness-110 transition-all font-mono tracking-wide"
                   >Save Metrics</button>
                </div>
             </div>
          )}

       </div>
    </div>
  );
}

function MetricCard({ title, value, icon }: { title: string, value: string, icon: React.ReactNode }) {
  return (
    <div className="bg-[var(--surface-hi)] border border-[var(--border)] rounded-xl p-5 flex flex-col justify-between shadow-sm hover:border-[var(--violet)] transition-colors group">
      <div className="text-[12px] text-[var(--text-2)] font-medium flex items-center justify-between mb-4 group-hover:text-[var(--text-1)] transition-colors">
        {title}
        <span className="text-[var(--violet)] opacity-80">{icon}</span>
      </div>
      <div className="text-[28px] font-semibold text-[var(--text-1)] tracking-tight">{value}</div>
    </div>
  );
}

function AlertTriangle(props: any) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
}
export default AnalyticsDashboard;
