"use client";

import { useState } from "react";
import { Loader2, Mic, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import LoadingShimmer from "@/components/ui/LoadingShimmer";
import { cn } from "@/lib/utils";

export interface BrandVoiceAnalysis {
  voice_summary: string;
  characteristics: Array<{ trait: string; description: string; example: string }>;
  do_list: string[];
  dont_list: string[];
  tone_words: string[];
  writing_prompt: string;
}

interface BrandVoiceTrainerProps {
  analysis: BrandVoiceAnalysis | null;
  isLoading: boolean;
  isAnalyzing: boolean;
  onAnalyze: (samples: string[]) => void;
}

export function BrandVoiceTrainer({
  analysis,
  isLoading,
  isAnalyzing,
  onAnalyze
}: BrandVoiceTrainerProps) {
  const [inputText, setInputText] = useState("");
  const [isRetraining, setIsRetraining] = useState(false);

  // Split by exactly '---' allowing optional whitespace or multiple dashes
  const samples = inputText.split(/^---+$/gm).map(s => s.trim()).filter(Boolean);
  const sampleCount = samples.length;

  const handleAnalyze = () => {
    if (sampleCount >= 3) {
      onAnalyze(samples);
      setIsRetraining(false);
    }
  };

  if (isLoading) {
    return (
      <div className="panel flex flex-col gap-6 p-8 h-full bg-[var(--surface)]">
         <LoadingShimmer className="h-6 w-48 mb-4" />
         <LoadingShimmer className="h-20 w-full rounded-xl" />
         <div className="grid grid-cols-2 gap-4">
           <LoadingShimmer className="h-32 w-full rounded-xl" />
           <LoadingShimmer className="h-32 w-full rounded-xl" />
         </div>
      </div>
    );
  }

  if (isAnalyzing) {
    return (
      <div className="panel flex h-full flex-col justify-center items-center text-center p-8 bg-[var(--surface-hi)]">
        <div className="h-12 w-12 rounded-full bg-[rgba(123,97,255,0.1)] flex items-center justify-center mb-6 text-[var(--violet)]">
          <Loader2 size={24} className="animate-spin" />
        </div>
        <h3 className="font-display text-[16px] text-[var(--text-1)] mb-2">Reading your writing patterns...</h3>
        <p className="text-[12px] text-[var(--text-3)] max-w-xs mx-auto">
          Extracting vocabulary, sentence structures, and emotional tone from your samples.
        </p>
      </div>
    );
  }

  const showForm = !analysis || isRetraining;

  if (showForm) {
    return (
      <div className="panel flex h-full justify-center items-center p-6 bg-[var(--surface)]">
        <div className="max-w-xl w-full flex flex-col items-center">
          <div className="h-12 w-12 rounded-full bg-[rgba(123,97,255,0.1)] flex items-center justify-center mb-4 text-[var(--violet)]">
             <Mic size={24} />
          </div>
          <h3 className="font-display text-[20px] text-[var(--text-1)] mb-2 text-center">Train your brand voice</h3>
          <p className="text-[13px] text-[var(--text-2)] leading-relaxed text-center mb-6 max-w-md">
            Paste 5-10 of your existing posts and the agent learns your writing style. Every post it generates after this will match your voice.
          </p>

          <div className="w-full relative shadow-sm rounded-xl">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Paste your posts here, separated by ---&#10;&#10;Example:&#10;My first viral post...&#10;---&#10;A thread about startups...&#10;---&#10;A short thought on design..."
              className="w-full bg-[var(--surface-hi)] border border-[var(--border)] rounded-xl p-4 text-[14px] text-[var(--text-1)] leading-relaxed resize-none outline-none focus:border-[var(--violet)] transition-colors min-h-[200px]"
              rows={10}
            />
            
            <div className="flex items-center justify-between mt-3 px-1">
               <div className={cn(
                 "text-[11px] font-mono",
                 sampleCount >= 3 ? "text-[var(--green)]" : "text-[var(--text-3)]"
               )}>
                 {sampleCount} samples added · Minimum 3 required
               </div>
               
               <div className="flex items-center gap-3">
                 {isRetraining && analysis && (
                   <button 
                     onClick={() => setIsRetraining(false)}
                     className="text-[12px] text-[var(--text-3)] hover:text-[var(--text-1)] transition-colors"
                   >
                     Cancel
                   </button>
                 )}
                 <button
                   onClick={handleAnalyze}
                   disabled={sampleCount < 3}
                   className="flex items-center gap-2 bg-[var(--violet)] text-white px-5 py-2 rounded-lg text-[13px] font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110 transition-all shadow-md shadow-[rgba(123,97,255,0.2)]"
                 >
                   Analyze my voice
                 </button>
               </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="panel flex flex-col h-full bg-[var(--surface)] overflow-hidden">
      <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8">
        
        {/* SECTION 1 — Voice summary */}
        <div className="bg-[var(--surface-hi)] rounded-xl p-6 border border-[var(--border)] relative overflow-hidden shadow-sm">
          <div className="absolute top-0 right-0 p-6 opacity-[0.03] pointer-events-none">
            <Mic size={120} />
          </div>
          <h3 className="font-display text-[16px] text-[var(--text-1)] mb-3 relative z-10 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--violet)]" />
            Your brand voice
          </h3>
          <p className="text-[14px] text-[var(--text-1)] leading-relaxed mb-6 relative z-10 max-w-3xl">
            {analysis.voice_summary}
          </p>
          
          <div className="flex flex-wrap gap-2 relative z-10">
            {analysis.tone_words?.map((word, i) => (
              <span key={i} className="bg-[rgba(123,97,255,0.1)] border border-[rgba(123,97,255,0.2)] text-[var(--violet)] px-3 py-1 rounded-full text-[11px] font-mono capitalize tracking-wide shadow-sm">
                {word}
              </span>
            ))}
          </div>
        </div>

        {/* SECTION 2 — Characteristics */}
        <div>
           <h4 className="text-[11px] font-mono uppercase tracking-widest text-[var(--text-3)] mb-4 ml-1">Writing patterns</h4>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {analysis.characteristics?.map((char, i) => (
               <div key={i} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 shadow-sm hover:border-[var(--violet)] hover:shadow-md transition-all group">
                 <div className="font-semibold text-[14px] text-[var(--text-1)] mb-1.5 group-hover:text-[var(--violet)] transition-colors">{char.trait}</div>
                 <p className="text-[13px] text-[var(--text-2)] leading-snug mb-4">{char.description}</p>
                 <div className="text-[12px] text-[var(--text-3)] italic border-l-2 border-[var(--border-hi)] pl-3 leading-relaxed">
                   "{char.example}"
                 </div>
               </div>
             ))}
           </div>
        </div>

        {/* SECTION 3 — Do and don't */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[var(--surface-hi)] rounded-xl p-6 border border-[var(--border)] shadow-sm">
             <h4 className="text-[13px] font-semibold text-[var(--text-1)] mb-5 flex items-center gap-2">
               <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[rgba(0,255,136,0.1)]">
                 <span className="w-2 h-2 rounded-full bg-[var(--green)]" />
               </span>
               Always do
             </h4>
             <ul className="space-y-4">
               {analysis.do_list?.map((item, i) => (
                 <li key={i} className="flex items-start gap-3">
                   <CheckCircle2 size={16} className="text-[var(--green)] mt-0.5 flex-shrink-0 opacity-80" />
                   <span className="text-[13px] text-[var(--text-2)] leading-snug">{item}</span>
                 </li>
               ))}
             </ul>
          </div>
          
          <div className="bg-[var(--surface-hi)] rounded-xl p-6 border border-[var(--border)] shadow-sm">
             <h4 className="text-[13px] font-semibold text-[var(--text-1)] mb-5 flex items-center gap-2">
               <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[rgba(255,107,53,0.1)]">
                 <span className="w-2 h-2 rounded-full bg-[var(--ember)]" />
               </span>
               Never do
             </h4>
             <ul className="space-y-4">
               {analysis.dont_list?.map((item, i) => (
                 <li key={i} className="flex items-start gap-3">
                   <XCircle size={16} className="text-[var(--ember)] mt-0.5 flex-shrink-0 opacity-80" />
                   <span className="text-[13px] text-[var(--text-2)] leading-snug">{item}</span>
                 </li>
               ))}
             </ul>
          </div>
        </div>

      </div>

      {/* SECTION 4 — Retrain */}
      <div className="border-t border-[var(--border)] bg-[var(--surface-hi)] px-6 py-4 flex items-center justify-between mt-auto shadow-[0_-4px_10px_rgba(0,0,0,0.02)] relative z-10">
        <p className="text-[11px] text-[var(--text-3)] font-mono flex items-center">
          <span className="relative flex h-2 w-2 mr-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--violet)] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--violet)]"></span>
          </span>
          Voice is automatically applied to all new posts
        </p>
        <button
          onClick={() => setIsRetraining(true)}
          className="flex items-center gap-1.5 text-[12px] font-medium text-[var(--text-2)] hover:text-[var(--text-1)] bg-[var(--surface)] border border-[var(--border)] rounded-lg px-4 py-2 transition-colors shadow-sm hover:shadow-md"
        >
          <RefreshCw size={14} />
          Retrain voice
        </button>
      </div>
    </div>
  );
}

export default BrandVoiceTrainer;
