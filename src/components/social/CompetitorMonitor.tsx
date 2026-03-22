"use client";

import { useState } from "react";
import { Users, Plus, X, Search, Crosshair, MessageSquareText, TrendingUp, Presentation, CheckCircle2 } from "lucide-react";
import LoadingShimmer from "@/components/ui/LoadingShimmer";
import { cn } from "@/lib/utils";

interface Competitor {
  id: string;
  name: string;
  linkedin_url: string;
  twitter_handle: string;
  notes: string;
  analysis?: any;
}

interface CompetitorMonitorProps {
  competitors: Competitor[];
  isLoading: boolean;
  onAdd: (competitor: any) => void;
  onRemove: (id: string) => void;
  onAnalyze: () => void;
}

export function CompetitorMonitor({
  competitors = [],
  isLoading,
  onAdd,
  onRemove,
  onAnalyze
}: CompetitorMonitorProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({ name: "", linkedin_url: "", twitter_handle: "", notes: "" });

  if (isLoading) {
    return (
      <div className="panel p-6 h-full flex flex-col gap-6 bg-[var(--surface)]">
         <div className="flex justify-between">
           <LoadingShimmer className="h-6 w-48 mb-4" />
           <LoadingShimmer className="h-8 w-32 rounded" />
         </div>
         <div className="flex flex-col gap-4">
            {[1,2,3].map(i => <LoadingShimmer key={i} className="h-32 w-full rounded-xl" />)}
         </div>
      </div>
    );
  }

  const handleSave = () => {
    if (formData.name) {
       onAdd(formData);
       setFormData({ name: "", linkedin_url: "", twitter_handle: "", notes: "" });
       setIsAdding(false);
    }
  };

  if (competitors.length === 0 && !isAdding) {
     return (
       <div className="panel flex h-full flex-col justify-center items-center text-center p-8 bg-[var(--surface-hi)]">
        <div className="flex flex-col items-center max-w-sm">
          <div className="h-12 w-12 rounded-full bg-[rgba(123,97,255,0.1)] flex items-center justify-center mb-4 text-[var(--violet)]">
            <Users size={24} />
          </div>
          <h3 className="font-display text-[18px] text-[var(--text-1)] mb-2">Track up to 5 competitors</h3>
          <p className="font-mono text-[12px] text-[var(--text-3)] leading-relaxed mb-6">
            Keep an eye on their content strategy, find gaps, and figure out how to stand out in your market.
          </p>
          <button 
             onClick={() => setIsAdding(true)}
             className="bg-[var(--violet)] text-white px-5 py-2.5 rounded-lg text-[13px] font-medium hover:brightness-110 transition-all flex items-center gap-2 shadow-sm shadow-[rgba(123,97,255,0.2)]"
          >
             <Plus size={16} /> Add competitor
          </button>
        </div>
      </div>
     );
  }

  return (
    <div className="panel flex flex-col h-full bg-[var(--surface)] overflow-hidden">
      
      {/* ── HEADER ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-6 py-4 bg-[var(--surface-hi)] z-10 shrink-0">
        <div className="flex items-center gap-3">
          <span className="font-display text-[16px] text-[var(--text-1)] flex items-center gap-2">
            <Users size={16} className="text-[var(--violet)]" />
            {competitors.length} / 5 competitors tracked
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onAnalyze}
            disabled={competitors.length === 0}
            className="flex items-center gap-2 bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--violet)] text-[var(--text-1)] hover:text-[var(--violet)] disabled:opacity-50 disabled:cursor-not-allowed px-4 py-1.5 rounded-lg text-[12px] font-medium transition-all"
          >
            <Search size={14} /> Analyze all
          </button>
          
          <button
            onClick={() => setIsAdding(true)}
            disabled={competitors.length >= 5 || isAdding}
            className="flex items-center gap-2 bg-[var(--violet)] text-white hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-1.5 rounded-lg text-[12px] font-medium transition-all shadow-sm"
          >
            <Plus size={14} /> Add competitor
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
        
        {/* ADD FORM */}
        {isAdding && (
           <div className="bg-[var(--surface-hi)] border border-[var(--violet)] rounded-xl p-5 shadow-md shadow-[rgba(123,97,255,0.1)] mb-6 animate-in fade-in slide-in-from-top-2">
              <h4 className="font-semibold text-[14px] text-[var(--text-1)] mb-4">Add Competitor</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-[11px] font-mono text-[var(--text-2)] mb-1.5 uppercase tracking-wider">Company / Name</label>
                  <input type="text" className="w-full bg-[var(--background)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text-1)] outline-none focus:border-[var(--violet)] transition-colors"
                         value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Acme Corp" />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-[var(--text-2)] mb-1.5 uppercase tracking-wider">LinkedIn URL</label>
                  <input type="text" className="w-full bg-[var(--background)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text-1)] outline-none focus:border-[var(--violet)] transition-colors"
                         value={formData.linkedin_url} onChange={e => setFormData({...formData, linkedin_url: e.target.value})} placeholder="linkedin.com/company/acme" />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-[var(--text-2)] mb-1.5 uppercase tracking-wider">Twitter Handle</label>
                  <input type="text" className="w-full bg-[var(--background)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text-1)] outline-none focus:border-[var(--violet)] transition-colors"
                         value={formData.twitter_handle} onChange={e => setFormData({...formData, twitter_handle: e.target.value})} placeholder="@acme_hq" />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-[var(--text-2)] mb-1.5 uppercase tracking-wider">Notes</label>
                  <input type="text" className="w-full bg-[var(--background)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text-1)] outline-none focus:border-[var(--violet)] transition-colors"
                         value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="They post mostly product updates..." />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-[var(--border)] mt-2">
                 <button onClick={() => setIsAdding(false)} className="px-4 py-1.5 text-[12px] font-medium text-[var(--text-2)] hover:text-[var(--text-1)] transition-colors">Cancel</button>
                 <button
                   onClick={handleSave}
                   disabled={!formData.name}
                   className="bg-[var(--violet)] text-white px-5 py-1.5 rounded-lg text-[12px] font-medium shadow-sm hover:brightness-110 disabled:opacity-50 transition-all"
                 >Save Competitor</button>
              </div>
           </div>
        )}

        {/* COMPETITOR CARDS */}
        {competitors.map((comp) => (
          <div key={comp.id} className="bg-[var(--surface-hi)] border border-[var(--border)] hover:border-[var(--border-hi)] rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all relative group">
             
             <button 
               onClick={() => onRemove(comp.id)}
               className="absolute right-3 top-3 p-1.5 text-[var(--text-3)] hover:text-[var(--ember)] opacity-0 group-hover:opacity-100 transition-opacity bg-[var(--surface)] border border-transparent hover:border-[rgba(255,107,53,0.3)] rounded-full hover:bg-[rgba(255,107,53,0.1)]"
               title="Remove competitor"
             >
               <X size={14} />
             </button>

             <div className="p-5 md:p-6 border-b border-[var(--border)] bg-[var(--background)]">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-display text-[18px] text-[var(--text-1)] mb-1 flex items-center gap-2">
                      {comp.name}
                    </h3>
                    <div className="flex items-center gap-4 text-[12px] text-[var(--text-3)]">
                      {comp.linkedin_url && <a href={`https://${comp.linkedin_url.replace('https://', '')}`} target="_blank" className="hover:text-[var(--violet)] transition-colors">LinkedIn ↗</a>}
                      {comp.twitter_handle && <a href={`https://twitter.com/${comp.twitter_handle.replace('@', '')}`} target="_blank" className="hover:text-[var(--violet)] transition-colors">Twitter ↗</a>}
                    </div>
                  </div>
                </div>
                
                {comp.notes && (
                  <p className="mt-4 text-[13px] text-[var(--text-2)] italic border-l-2 border-[var(--border-hi)] pl-3">
                    {comp.notes}
                  </p>
                )}
             </div>

             {/* ANALYSIS SECTION */}
             <div className="p-5 md:p-6 bg-[var(--surface-hi)]">
               {comp.analysis ? (
                 <div className="space-y-6">
                   <div className="flex flex-wrap gap-2 mb-2">
                     <span className="bg-[rgba(123,97,255,0.05)] border border-[rgba(123,97,255,0.2)] text-[var(--violet)] px-2.5 py-1 rounded text-[10px] font-mono uppercase tracking-widest flex items-center gap-1.5">
                       <TrendingUp size={12} /> {comp.analysis.posting_frequency_estimate || 'Unknown frequency'}
                     </span>
                     <span className="bg-[var(--surface)] border border-[var(--border)] text-[var(--text-2)] px-2.5 py-1 rounded text-[10px] font-mono uppercase tracking-widest flex items-center gap-1.5">
                       <MessageSquareText size={12} /> Tone: {comp.analysis.tone_estimate || 'Unknown'}
                     </span>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div>
                       <h4 className="text-[12px] font-bold text-[var(--text-1)] mb-3 flex items-center gap-2">
                         <Presentation size={14} className="text-[var(--text-3)]" /> Content Gaps
                       </h4>
                       <ul className="space-y-2">
                         {comp.analysis.content_gaps?.map((gap: string, i: number) => (
                           <li key={i} className="flex items-start gap-2.5 text-[13px] text-[var(--text-2)] leading-snug">
                             <div className="w-1.5 h-1.5 rounded-full bg-[var(--text-3)] mt-1.5 flex-shrink-0" />
                             {gap}
                           </li>
                         ))}
                       </ul>
                     </div>
                     <div>
                       <h4 className="text-[12px] font-bold text-[var(--text-1)] mb-3 flex items-center gap-2">
                         <Crosshair size={14} className="text-[var(--violet)]" /> How to Differentiate
                       </h4>
                       <ul className="space-y-2">
                         {comp.analysis.differentiation_opportunities?.map((opp: string, i: number) => (
                           <li key={i} className="flex items-start gap-2.5 text-[13px] text-[var(--text-1)] leading-snug">
                             <CheckCircle2 size={14} className="text-[var(--violet)] mt-0.5 flex-shrink-0" />
                             {opp}
                           </li>
                         ))}
                       </ul>
                     </div>
                   </div>

                   <div className="bg-[var(--surface)] border border-[var(--border-hi)] rounded-lg p-4">
                     <h4 className="text-[11px] font-mono uppercase tracking-widest text-[var(--text-3)] mb-2">Strategy Recommendation</h4>
                     <p className="text-[13px] text-[var(--text-1)] leading-relaxed">
                       {comp.analysis.recommended_response_strategy}
                     </p>
                   </div>
                 </div>
               ) : (
                 <div className="flex flex-col items-center justify-center p-6 text-center border-2 border-dashed border-[var(--border)] rounded-xl bg-[var(--background)]">
                   <Search size={20} className="text-[var(--text-3)] mb-3" />
                   <h4 className="text-[14px] font-medium text-[var(--text-1)] mb-1">No setup analysis yet</h4>
                   <p className="text-[12px] text-[var(--text-3)] mb-4 max-w-xs">Run analysis to uncover content gaps and differentiation opportunities.</p>
                   <button
                     onClick={onAnalyze}
                     className="bg-[rgba(123,97,255,0.1)] text-[var(--violet)] hover:bg-[rgba(123,97,255,0.15)] border border-[rgba(123,97,255,0.2)] px-4 py-1.5 rounded-lg text-[12px] font-medium transition-colors shadow-sm"
                   >
                     Analyze {comp.name}
                   </button>
                 </div>
               )}
             </div>

          </div>
        ))}
        
      </div>
    </div>
  );
}

export default CompetitorMonitor;
