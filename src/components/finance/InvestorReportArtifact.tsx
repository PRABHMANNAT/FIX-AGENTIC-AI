"use client";

import { useState, useRef, useEffect } from "react";
import { FileText, Download, ChevronDown, ChevronUp, AlertTriangle, Loader2, CheckCircle, Target, TrendingUp, Sparkles } from "lucide-react";
import { MetricCard } from "@/components/ui/MetricCard";
import LoadingShimmer from "@/components/ui/LoadingShimmer";
import { useFinanceExport } from "@/hooks/useFinanceExport";

// ─── Types ────────────────────────────────────────────────────────────────────

interface InvestorReportData {
  executive_summary?: string;
  mrr?: number;
  arr?: number;
  mrr_growth_percent?: number;
  burn_rate?: number;
  runway_months?: number;
  gross_margin_percent?: number;
  key_wins?: string[];
  risks?: string[];
  asks?: string[];
  next_month_targets?: string[];
}

interface InvestorReportArtifactProps {
  documentId: string;
  report?: InvestorReportData;
  // Alternate prop names the caller may use
  reportData?: InvestorReportData;
  isLoading?: boolean;
  companyName?: string;
  month?: string;
  year?: number;
  onGeneratePitchDeck?: (pitchDocId: string) => void;
  // Legacy direct download callbacks (optional)
  onDownloadPDF?: () => void;
  onDownloadDOCX?: () => void;
  onDownloadPPTX?: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number | undefined, prefix = ""): string {
  if (typeof n !== "number") return "—";
  return `${prefix}${n.toLocaleString("en-IN")}`;
}

function fmtPct(n: number | undefined): string {
  if (typeof n !== "number") return "—";
  return `${n}%`;
}

function arr(v: unknown): string[] {
  return Array.isArray(v) ? v.map((x) => String(x)) : [];
}

// ─── Flash hook — highlights a field when its value changes ──────────────────

function useFlash(dep: unknown): boolean {
  const [flashing, setFlashing] = useState(false);
  const prevRef = useRef(dep);

  useEffect(() => {
    if (prevRef.current !== dep && prevRef.current !== undefined) {
      setFlashing(true);
      const t = setTimeout(() => setFlashing(false), 900);
      return () => clearTimeout(t);
    }
    prevRef.current = dep;
  }, [dep]);

  return flashing;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionToggle({
  label,
  icon,
  children,
  defaultOpen = true,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-[var(--border)] last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-3 text-left"
        style={{ background: "transparent", cursor: "pointer", border: "none" }}
      >
        <span className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.25em] text-[var(--text-3)]">
          {icon}
          {label}
        </span>
        {open ? (
          <ChevronUp size={12} className="text-[var(--text-3)]" />
        ) : (
          <ChevronDown size={12} className="text-[var(--text-3)]" />
        )}
      </button>
      {open && <div className="px-5 pb-4">{children}</div>}
    </div>
  );
}

function BulletItem({
  text,
  tone,
}: {
  text: string;
  tone: "green" | "ember" | "violet" | "muted";
}) {
  const colors = {
    green: "var(--green)",
    ember: "var(--ember)",
    violet: "var(--violet)",
    muted: "var(--text-3)",
  };
  return (
    <li className="flex items-start gap-3 py-1.5 border-b border-[var(--border)] last:border-b-0">
      <span
        style={{ color: colors[tone], flexShrink: 0, marginTop: 1, fontSize: 16, lineHeight: 1 }}
        aria-hidden
      >
        ›
      </span>
      <span
        className="font-comfortaa text-[13px] leading-[1.65]"
        style={{ color: "var(--text-2)" }}
      >
        {text}
      </span>
    </li>
  );
}

function InlineError({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div
      className="flex items-center gap-2 border-b border-[var(--border)] px-5 py-2.5"
      style={{ background: "rgba(255,107,53,0.07)", fontSize: 11 }}
    >
      <AlertTriangle size={12} style={{ color: "var(--ember)", flexShrink: 0 }} />
      <span style={{ color: "var(--ember)", flex: 1, fontFamily: "var(--font-mono)", letterSpacing: "0.05em" }}>
        {message}
      </span>
      <button
        type="button"
        onClick={onDismiss}
        style={{ color: "var(--text-3)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
      >
        ✕
      </button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function InvestorReportArtifact({
  documentId,
  report: reportProp,
  reportData,
  isLoading = false,
  companyName = "Your Company",
  month = "Current",
  year = new Date().getFullYear(),
  onGeneratePitchDeck,
  onDownloadPDF,
  onDownloadDOCX,
  onDownloadPPTX,
}: InvestorReportArtifactProps) {
  const report = reportProp ?? reportData ?? {};

  const fileBase = `${companyName.replace(/\s+/g, "-").toLowerCase()}-investor-update-${month}-${year}`;
  const exporter = useFinanceExport({ documentId, fileBaseName: fileBase });

  const [generatingDeck, setGeneratingDeck] = useState(false);
  const [deckError, setDeckError] = useState<string | null>(null);

  // Flash refs for each field
  const mrrFlash = useFlash(report.mrr);
  const arrFlash = useFlash(report.arr);
  const burnFlash = useFlash(report.burn_rate);
  const runwayFlash = useFlash(report.runway_months);
  const summaryFlash = useFlash(report.executive_summary);
  const winsFlash = useFlash(report.key_wins?.join(","));

  const handleExport = async (type: "pdf" | "docx" | "pptx") => {
    if (type === "pdf" && onDownloadPDF) return onDownloadPDF();
    if (type === "docx" && onDownloadDOCX) return onDownloadDOCX();
    if (type === "pptx" && onDownloadPPTX) return onDownloadPPTX();
    await exporter.triggerDownload(type);
  };

  const handleGeneratePitchDeck = async () => {
    setGeneratingDeck(true);
    setDeckError(null);
    try {
      const res = await fetch("/api/finance/investor-report/pitch-deck", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(json.error ?? "Failed to generate pitch deck.");
      }
      const json = (await res.json()) as { documentId?: string; slides?: unknown };
      if (json.documentId && onGeneratePitchDeck) {
        onGeneratePitchDeck(json.documentId);
      }
    } catch (e) {
      setDeckError(e instanceof Error ? e.message : "Pitch deck generation failed.");
    } finally {
      setGeneratingDeck(false);
    }
  };

  // ─── Loading skeleton ────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="panel flex flex-col gap-0 overflow-hidden anim-fade-in">
        {/* Header skeleton */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <div className="flex items-center gap-3">
            <LoadingShimmer className="h-7 w-7 rounded" />
            <div className="flex flex-col gap-1.5">
              <LoadingShimmer className="h-3.5 w-32" />
              <LoadingShimmer className="h-2.5 w-20" />
            </div>
          </div>
          <div className="flex gap-2">
            <LoadingShimmer className="h-8 w-24" />
            <LoadingShimmer className="h-8 w-24" />
            <LoadingShimmer className="h-8 w-28" />
          </div>
        </div>
        {/* Metric strip skeleton */}
        <div className="grid grid-cols-4 gap-3 border-b border-[var(--border)] p-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="panel p-4 flex flex-col gap-3">
              <LoadingShimmer className="h-2 w-12" />
              <LoadingShimmer className="h-8 w-20" />
              <LoadingShimmer className="h-2 w-10" />
            </div>
          ))}
        </div>
        {/* Body skeleton */}
        <div className="flex flex-col gap-3 p-5">
          {[0, 1, 2].map((i) => (
            <LoadingShimmer key={i} className="h-3 w-full" />
          ))}
        </div>
      </div>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="panel flex flex-col gap-0 overflow-hidden anim-fade-in">
      {/* ── Toolbar ────────────────────────────────────────────────────── */}
      <div
        className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border)] px-5 py-4"
        style={{ background: "var(--surface)" }}
      >
        {/* Title */}
        <div className="flex items-center gap-3">
          <div
            className="flex h-8 w-8 items-center justify-center rounded"
            style={{
              background: "rgba(123,97,255,0.08)",
              border: "1px solid rgba(123,97,255,0.2)",
              color: "var(--violet)",
            }}
          >
            <FileText size={14} />
          </div>
          <div>
            <p className="font-comfortaa text-[13px] font-semibold leading-tight" style={{ color: "var(--text-1)" }}>
              {companyName}
            </p>
            <p className="font-mono text-[9px] uppercase tracking-[0.2em]" style={{ color: "var(--text-3)" }}>
              Investor Update — {month} {year}
              <span
                className="ml-3 inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[8px] uppercase tracking-widest"
                style={{ border: "1px solid rgba(255,107,53,0.3)", color: "var(--ember)" }}
              >
                Confidential
              </span>
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {(["pdf", "docx", "pptx"] as const).map((fmt_) => (
            <button
              key={fmt_}
              type="button"
              id={`export-${fmt_}-btn`}
              className="button-ghost"
              style={{ padding: "8px 14px", fontSize: 10, minHeight: 34, gap: 6 }}
              onClick={() => handleExport(fmt_)}
              disabled={exporter.isLoading(fmt_) || exporter.anyLoading}
            >
              {exporter.isLoading(fmt_) ? (
                <Loader2 size={11} className="animate-spin" />
              ) : (
                <Download size={11} />
              )}
              {exporter.isLoading(fmt_) ? "Exporting…" : fmt_.toUpperCase()}
            </button>
          ))}

          <button
            type="button"
            id="generate-pitch-deck-btn"
            className="button-ghost"
            style={{
              padding: "8px 14px",
              fontSize: 10,
              minHeight: 34,
              gap: 6,
              borderColor: "rgba(123,97,255,0.3)",
              color: "var(--violet)",
            }}
            onClick={handleGeneratePitchDeck}
            disabled={generatingDeck}
          >
            {generatingDeck ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
            {generatingDeck ? "Building…" : "Pitch Deck"}
          </button>
        </div>
      </div>

      {/* ── Inline errors ─────────────────────────────────────────────── */}
      {exporter.error("pdf") && (
        <InlineError message={exporter.error("pdf")!} onDismiss={() => exporter.clearError("pdf")} />
      )}
      {exporter.error("docx") && (
        <InlineError message={exporter.error("docx")!} onDismiss={() => exporter.clearError("docx")} />
      )}
      {exporter.error("pptx") && (
        <InlineError message={exporter.error("pptx")!} onDismiss={() => exporter.clearError("pptx")} />
      )}
      {deckError && (
        <InlineError message={deckError} onDismiss={() => setDeckError(null)} />
      )}

      {/* ── Metric Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-px border-b border-[var(--border)] sm:grid-cols-4">
        <div
          className={`transition-colors duration-300 ${mrrFlash ? "bg-[rgba(0,255,136,0.06)]" : ""}`}
        >
          <MetricCard
            label="MRR"
            value={fmt(report.mrr)}
            unit="₹"
            change={report.mrr_growth_percent}
            tone="green"
            className="rounded-none border-0 border-r border-[var(--border)]"
          />
        </div>
        <div className={`transition-colors duration-300 ${arrFlash ? "bg-[rgba(0,255,136,0.06)]" : ""}`}>
          <MetricCard
            label="ARR"
            value={fmt(report.arr)}
            unit="₹"
            tone="green"
            className="rounded-none border-0 border-r border-[var(--border)]"
          />
        </div>
        <div className={`transition-colors duration-300 ${burnFlash ? "bg-[rgba(255,107,53,0.06)]" : ""}`}>
          <MetricCard
            label="Burn Rate"
            value={fmt(report.burn_rate)}
            unit="₹"
            tone="amber"
            changeLabel="/ month"
            className="rounded-none border-0 border-r border-[var(--border)]"
          />
        </div>
        <div className={`transition-colors duration-300 ${runwayFlash ? "bg-[rgba(123,97,255,0.06)]" : ""}`}>
          <MetricCard
            label="Runway"
            value={typeof report.runway_months === "number" ? String(report.runway_months) : "—"}
            changeLabel="months"
            tone="cyan"
            className="rounded-none border-0"
          />
        </div>
      </div>

      {/* ── Secondary metrics row ─────────────────────────────────────── */}
      <div
        className="flex flex-wrap items-center gap-6 border-b border-[var(--border)] px-5 py-3"
        style={{ background: "var(--surface-hi)" }}
      >
        {[
          { label: "Gross Margin", value: fmtPct(report.gross_margin_percent) },
          { label: "MRR Growth", value: fmtPct(report.mrr_growth_percent) },
          { label: "Doc ID", value: documentId.slice(0, 8) + "…" },
        ].map(({ label, value }) => (
          <div key={label} className="flex flex-col gap-0.5">
            <span className="system-label">{label}</span>
            <span className="font-mono text-[11px]" style={{ color: "var(--text-1)" }}>
              {value}
            </span>
          </div>
        ))}
      </div>

      {/* ── Collapsible Sections ──────────────────────────────────────── */}

      {/* Executive Summary */}
      <SectionToggle label="Executive Summary" icon={<FileText size={11} />}>
        <p
          className={`font-comfortaa text-[13px] leading-[1.7] transition-colors duration-700 ${
            summaryFlash ? "text-[var(--text-1)]" : "text-[var(--text-2)]"
          }`}
          style={summaryFlash ? { background: "rgba(0,255,136,0.04)", padding: "8px", borderRadius: 4 } : {}}
        >
          {report.executive_summary ?? "—"}
        </p>
      </SectionToggle>

      {/* Key Wins */}
      <SectionToggle label="Key Wins" icon={<CheckCircle size={11} />}>
        <ul
          className={`flex flex-col transition-colors duration-500 ${
            winsFlash ? "bg-[rgba(0,255,136,0.04)] rounded" : ""
          }`}
        >
          {arr(report.key_wins).length ? (
            arr(report.key_wins).map((win, i) => (
              <BulletItem key={i} text={win} tone="green" />
            ))
          ) : (
            <BulletItem text="No wins recorded yet." tone="muted" />
          )}
        </ul>
      </SectionToggle>

      {/* Risks */}
      <SectionToggle label="Risks" icon={<AlertTriangle size={11} />} defaultOpen={false}>
        <ul className="flex flex-col">
          {arr(report.risks).length ? (
            arr(report.risks).map((risk, i) => (
              <BulletItem key={i} text={risk} tone="ember" />
            ))
          ) : (
            <BulletItem text="No risks flagged." tone="muted" />
          )}
        </ul>
      </SectionToggle>

      {/* Asks */}
      <SectionToggle label="Asks from Investors" icon={<Target size={11} />} defaultOpen={false}>
        <ul className="flex flex-col">
          {arr(report.asks).length ? (
            arr(report.asks).map((ask, i) => (
              <BulletItem key={i} text={ask} tone="violet" />
            ))
          ) : (
            <BulletItem text="No asks specified." tone="muted" />
          )}
        </ul>
      </SectionToggle>

      {/* Next Month Targets */}
      <SectionToggle label="Next Month Targets" icon={<TrendingUp size={11} />} defaultOpen={false}>
        <ul className="flex flex-col">
          {arr(report.next_month_targets).length ? (
            arr(report.next_month_targets).map((target, i) => (
              <BulletItem key={i} text={target} tone="muted" />
            ))
          ) : (
            <BulletItem text="No targets set." tone="muted" />
          )}
        </ul>
      </SectionToggle>
    </div>
  );
}

export default InvestorReportArtifact;
