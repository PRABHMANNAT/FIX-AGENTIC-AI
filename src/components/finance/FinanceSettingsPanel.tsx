"use client";

import { useState, useRef, useCallback } from "react";
import { X, Upload, Loader2, Check, AlertTriangle, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface FinanceSettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: Record<string, unknown>) => void;
  initialSettings: Record<string, unknown> | null;
}

export function FinanceSettingsPanel({ isOpen, onClose, onSave, initialSettings }: FinanceSettingsPanelProps) {
  const [form, setForm] = useState({
    company_name: (initialSettings?.company_name as string) || "",
    company_address: (initialSettings?.company_address as string) || "",
    gstin: (initialSettings?.gstin as string) || "",
    currency: (initialSettings?.currency as string) || "INR",
    bank_details: (initialSettings?.bank_details as string) || "",
    logo_url: (initialSettings?.logo_url as string) || "",
    slack_webhook_url: (initialSettings?.slack_webhook_url as string) || "",
  });
  const [uploading, setUploading] = useState(false);
  const [slackStatus, setSlackStatus] = useState<"idle" | "sent" | "failed">("idle");
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const updateField = useCallback((field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleLogoUpload = async (file: File) => {
    setError(null);
    if (file.size > 2 * 1024 * 1024) {
      setError("File too large. Max 2MB.");
      return;
    }
    setUploading(true);
    try {
      // Upload to Supabase storage
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/finance/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, logo_url: URL.createObjectURL(file) }),
      });
      if (!res.ok) throw new Error("Failed to upload logo");
      const result = await res.json();
      if (result.settings?.logo_url) {
        updateField("logo_url", result.settings.logo_url);
      }
    } catch (err: any) {
      setError(err.message || "Logo upload failed");
    } finally {
      setUploading(false);
    }
  };

  const testSlack = async () => {
    if (!form.slack_webhook_url) return;
    try {
      const res = await fetch(form.slack_webhook_url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "✅ Test message from AssembleOne Finance" }),
      });
      setSlackStatus(res.ok ? "sent" : "failed");
    } catch {
      setSlackStatus("failed");
    }
    setTimeout(() => setSlackStatus("idle"), 2000);
  };

  const handleSave = () => {
    setError(null);
    if (!form.company_name.trim()) {
      setError("Company name is required.");
      return;
    }
    onSave(form);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />

      {/* Slide-over panel */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md flex flex-col bg-[var(--surface)] border-l border-[var(--border)] shadow-2xl anim-fade-in" style={{ animation: "slide-in-right 0.25s ease" }}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4 bg-[var(--surface-hi)]">
          <h2 className="font-display font-medium text-[16px] text-[var(--text-1)]">Finance Settings</h2>
          <button type="button" onClick={onClose} className="text-[var(--text-3)] hover:text-[var(--text-1)] transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {error && (
            <div className="flex items-center justify-between rounded bg-[rgba(239,68,68,0.1)] p-3 text-[12px] text-[var(--ember)] border border-[rgba(239,68,68,0.2)]">
              <div className="flex items-center gap-2">
                <AlertTriangle size={14} />
                <span>{error}</span>
              </div>
              <button onClick={() => setError(null)} className="hover:opacity-70"><X size={14} /></button>
            </div>
          )}

          {/* Section 1 — Company */}
          <div className="space-y-4">
            <h3 className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-3)]">Company Details</h3>

            <div className="space-y-1">
              <label className="font-mono text-[11px] text-[var(--text-2)]">Company Name *</label>
              <input value={form.company_name} onChange={(e) => updateField("company_name", e.target.value)} className="w-full rounded border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[13px] text-[var(--text-1)] focus:border-[var(--violet)] focus:outline-none" />
            </div>

            <div className="space-y-1">
              <label className="font-mono text-[11px] text-[var(--text-2)]">Company Address</label>
              <textarea value={form.company_address} onChange={(e) => updateField("company_address", e.target.value)} rows={2} className="w-full rounded border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[13px] text-[var(--text-1)] focus:border-[var(--violet)] focus:outline-none resize-none" />
            </div>

            <div className="space-y-1">
              <label className="font-mono text-[11px] text-[var(--text-2)]">GSTIN</label>
              <input value={form.gstin} onChange={(e) => updateField("gstin", e.target.value)} placeholder="22AAAAA0000A1Z5" className="w-full rounded border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[13px] text-[var(--text-1)] focus:border-[var(--violet)] focus:outline-none" />
            </div>

            <div className="space-y-1">
              <label className="font-mono text-[11px] text-[var(--text-2)]">Currency</label>
              <select value={form.currency} onChange={(e) => updateField("currency", e.target.value)} className="w-full rounded border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[13px] text-[var(--text-1)] focus:border-[var(--violet)] focus:outline-none">
                {["INR", "USD", "GBP", "EUR", "SGD", "AED"].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-mono text-[11px] text-[var(--text-2)]">Bank Details</label>
              <textarea value={form.bank_details} onChange={(e) => updateField("bank_details", e.target.value)} rows={3} placeholder="Bank name, Account no, IFSC, Branch" className="w-full rounded border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[13px] text-[var(--text-1)] focus:border-[var(--violet)] focus:outline-none resize-none" />
            </div>
          </div>

          {/* Section 2 — Branding */}
          <div className="space-y-4">
            <h3 className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-3)]">Branding</h3>
            <div className="flex items-center gap-4">
              {form.logo_url ? (
                <img src={form.logo_url} alt="Logo" className="h-12 w-12 rounded border border-[var(--border)] object-contain bg-white" />
              ) : (
                <div className="h-12 w-12 rounded border border-[var(--border)] bg-[var(--background)] flex items-center justify-center text-[var(--text-3)]">
                  <Upload size={16} />
                </div>
              )}
              <div>
                <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="button-ghost px-3 py-1.5 text-[12px] flex items-center gap-2">
                  {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                  Upload Logo
                </button>
                <p className="font-mono text-[10px] text-[var(--text-3)] mt-1">PNG or JPG, max 2MB</p>
              </div>
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleLogoUpload(e.target.files[0])} />
          </div>

          {/* Section 3 — Integrations */}
          <div className="space-y-4">
            <h3 className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-3)]">Integrations</h3>

            {/* Stripe */}
            <div className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface-hi)] p-4">
              <div>
                <div className="font-display text-[13px] text-[var(--text-1)]">Stripe</div>
                <div className="font-mono text-[10px] text-[var(--text-3)]">Revenue and subscription data</div>
              </div>
              {initialSettings?.stripe_connected ? (
                <span className="rounded-full px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.2)] text-emerald-500">Connected</span>
              ) : (
                <a href="/api/finance/stripe/connect" className="flex items-center gap-1.5 rounded bg-[var(--violet)] px-3 py-1.5 text-[11px] font-mono text-white hover:brightness-110 transition-all">
                  Connect <ExternalLink size={10} />
                </a>
              )}
            </div>

            {/* Slack */}
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-hi)] p-4 space-y-3">
              <div>
                <div className="font-display text-[13px] text-[var(--text-1)]">Slack</div>
                <div className="font-mono text-[10px] text-[var(--text-3)]">Weekly briefing delivery</div>
              </div>
              <div className="flex gap-2">
                <input
                  value={form.slack_webhook_url}
                  onChange={(e) => updateField("slack_webhook_url", e.target.value)}
                  placeholder="https://hooks.slack.com/services/..."
                  className="flex-1 rounded border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[12px] text-[var(--text-1)] focus:border-[var(--violet)] focus:outline-none"
                />
                <button type="button" onClick={testSlack} className="button-ghost px-3 py-1.5 text-[11px]">
                  {slackStatus === "sent" ? <Check size={12} className="text-[var(--green)]" /> : slackStatus === "failed" ? <AlertTriangle size={12} className="text-[var(--ember)]" /> : "Test"}
                </button>
              </div>
              {slackStatus === "sent" && <span className="font-mono text-[10px] text-[var(--green)]">Message sent!</span>}
              {slackStatus === "failed" && <span className="font-mono text-[10px] text-[var(--ember)]">Failed to send</span>}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-[var(--border)] px-6 py-4 bg-[var(--surface-hi)]">
          <button type="button" onClick={onClose} className="button-ghost px-4 py-2 text-[12px]">Cancel</button>
          <button type="button" onClick={handleSave} className="rounded bg-[var(--violet)] px-5 py-2 text-[12px] font-mono text-white hover:brightness-110 transition-all">Save</button>
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-in-right {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  );
}
