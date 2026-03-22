"use client";

import { useState, useEffect } from "react";
import { X, Save, RefreshCw, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SocialSettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  settings: any;
  onSave: (settings: any) => void;
  onRetrainVoice: () => void;
}

export function SocialSettingsPanel({
  isOpen,
  onClose,
  settings,
  onSave,
  onRetrainVoice
}: SocialSettingsPanelProps) {
  const [formData, setFormData] = useState({
    company_name: "",
    industry: "",
    target_audience: "",
    default_tone: "Professional",
    include_emojis: true,
    include_hashtags: true,
    hashtag_count: 5,
    ...settings
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setFormData(prev => ({ ...prev, ...settings }));
    }
  }, [settings]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-4 right-4 z-[50] w-[440px] bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right tracking-wide">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border)] bg-[var(--surface-hi)]">
        <h2 className="font-display text-[16px] text-[var(--text-1)]">Social Settings</h2>
        <button onClick={onClose} className="p-1 text-[var(--text-3)] hover:text-[var(--text-1)] rounded hover:bg-[var(--background)] transition-colors"><X size={18} /></button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        
        {/* Section 1 - Brand profile */}
        <section>
          <h3 className="text-[12px] font-mono uppercase tracking-widest text-[var(--text-3)] mb-4">Brand Profile</h3>
          <div className="space-y-4">
             <div>
               <label className="block text-[12px] text-[var(--text-2)] mb-1.5">Company Name</label>
               <input type="text" value={formData.company_name || ""} onChange={e => setFormData({...formData, company_name: e.target.value})} className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2 text-[13px] text-[var(--text-1)] outline-none focus:border-[var(--violet)] transition-colors" />
             </div>
             <div>
               <label className="block text-[12px] text-[var(--text-2)] mb-1.5">Industry</label>
               <input type="text" value={formData.industry || ""} onChange={e => setFormData({...formData, industry: e.target.value})} className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2 text-[13px] text-[var(--text-1)] outline-none focus:border-[var(--violet)] transition-colors" />
             </div>
             <div>
               <label className="block text-[12px] text-[var(--text-2)] mb-1.5">Target Audience</label>
               <textarea rows={3} value={formData.target_audience || ""} onChange={e => setFormData({...formData, target_audience: e.target.value})} placeholder="Who are you writing for?" className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2 text-[13px] text-[var(--text-1)] outline-none focus:border-[var(--violet)] transition-colors resize-none" />
             </div>
          </div>
        </section>

        {/* Section 2 - Connected platforms */}
        <section>
          <h3 className="text-[12px] font-mono uppercase tracking-widest text-[var(--text-3)] mb-4">Connected Platforms</h3>
          <div className="space-y-3">
             <div className="flex items-center justify-between p-3 border border-[var(--border)] rounded-lg bg-[var(--surface-hi)]">
               <span className="text-[13px] text-[var(--text-1)] font-medium">LinkedIn</span>
               <button className="text-[11px] bg-[var(--violet)] text-white px-3 py-1.5 rounded-md hover:brightness-110">Connect</button>
             </div>
             <div className="flex items-center justify-between p-3 border border-[var(--border)] rounded-lg bg-[var(--surface-hi)]">
               <span className="text-[13px] text-[var(--text-1)] font-medium">Twitter / X</span>
               <button className="text-[11px] bg-[var(--violet)] text-white px-3 py-1.5 rounded-md hover:brightness-110">Connect</button>
             </div>
             <div className="flex items-center justify-between p-3 border border-[var(--border)] rounded-lg bg-[var(--surface-hi)]">
               <span className="text-[13px] text-[var(--text-1)] font-medium">Instagram</span>
               <button className="text-[11px] bg-[var(--surface)] border border-[var(--border)] text-[var(--text-2)] px-3 py-1.5 rounded-md hover:text-[var(--text-1)] transition-colors">Connect</button>
             </div>
          </div>
        </section>

        {/* Section 3 - Posting preferences */}
        <section>
          <h3 className="text-[12px] font-mono uppercase tracking-widest text-[var(--text-3)] mb-4">Posting Preferences</h3>
          <div className="space-y-5">
             <div>
               <label className="block text-[12px] text-[var(--text-2)] mb-1.5">Default Tone</label>
               <select value={formData.default_tone} onChange={e => setFormData({...formData, default_tone: e.target.value})} className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2 text-[13px] text-[var(--text-1)] outline-none focus:border-[var(--violet)] transition-colors">
                 <option>Professional</option>
                 <option>Casual</option>
                 <option>Inspiring</option>
                 <option>Educational</option>
               </select>
             </div>
             
             <label className="flex items-center justify-between cursor-pointer">
               <span className="text-[13px] text-[var(--text-1)]">Include Emojis</span>
               <div className={cn("w-10 h-5 rounded-full flex items-center px-1 transition-colors", formData.include_emojis ? "bg-[var(--green)]" : "bg-[var(--border-hi)]")}>
                 <div className={cn("w-3.5 h-3.5 bg-white rounded-full transition-transform transform", formData.include_emojis ? "translate-x-4" : "translate-x-0")} />
               </div>
               <input type="checkbox" className="hidden" checked={formData.include_emojis} onChange={e => setFormData({...formData, include_emojis: e.target.checked})} />
             </label>

             <label className="flex items-center justify-between cursor-pointer">
               <span className="text-[13px] text-[var(--text-1)]">Include Hashtags</span>
               <div className={cn("w-10 h-5 rounded-full flex items-center px-1 transition-colors", formData.include_hashtags ? "bg-[var(--green)]" : "bg-[var(--border-hi)]")}>
                 <div className={cn("w-3.5 h-3.5 bg-white rounded-full transition-transform transform", formData.include_hashtags ? "translate-x-4" : "translate-x-0")} />
               </div>
               <input type="checkbox" className="hidden" checked={formData.include_hashtags} onChange={e => setFormData({...formData, include_hashtags: e.target.checked})} />
             </label>

             {formData.include_hashtags && (
               <div>
                 <div className="flex justify-between mb-1.5 text-[12px]">
                   <span className="text-[var(--text-2)]">Default Hashtag Count</span>
                   <span className="text-[var(--violet)] font-mono">{formData.hashtag_count}</span>
                 </div>
                 <input type="range" min="1" max="10" value={formData.hashtag_count} onChange={e => setFormData({...formData, hashtag_count: parseInt(e.target.value)})} className="w-full accent-[var(--violet)]" />
               </div>
             )}
          </div>
        </section>

        {/* Section 4 - AI preferences */}
        <section>
          <h3 className="text-[12px] font-mono uppercase tracking-widest text-[var(--text-3)] mb-4">AI Brand Voice</h3>
          <div className="bg-[var(--background)] border border-[var(--border)] rounded-lg p-4 mb-3">
             <div className="text-[13px] text-[var(--text-2)] leading-relaxed italic line-clamp-4">
                {formData.brand_voice ? formData.brand_voice : "No brand voice trained yet. Train the AI to sound like you."}
             </div>
          </div>
          <button onClick={() => { onClose(); onRetrainVoice(); }} className="flex items-center text-[12px] text-[var(--violet)] font-medium hover:brightness-110 group">
             <RefreshCw size={12} className="mr-1.5" /> Retrain brand voice <ChevronRight size={14} className="ml-1 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
          </button>
        </section>
        
      </div>

      {/* Footer */}
      <div className="p-5 border-t border-[var(--border)] bg-[var(--surface-hi)] flex items-center justify-end gap-3 shrink-0">
         <button onClick={onClose} className="px-4 py-2 text-[12px] font-medium text-[var(--text-2)] hover:text-[var(--text-1)]">Cancel</button>
         <button 
            onClick={async () => {
              setIsSaving(true);
              await onSave(formData);
              setIsSaving(false);
              onClose();
            }}
            className="flex items-center justify-center gap-2 bg-[var(--violet)] text-white px-5 py-2.5 rounded-lg text-[13px] font-medium shadow-sm hover:brightness-110 transition-all min-w-[120px]"
         >
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} 
            {isSaving ? "Saving..." : "Save Settings"}
         </button>
      </div>
    </div>
  );
}
