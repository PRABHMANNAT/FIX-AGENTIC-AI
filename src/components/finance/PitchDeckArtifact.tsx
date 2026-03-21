"use client";

import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  Presentation,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useFinanceExport } from "@/hooks/useFinanceExport";
import LoadingShimmer from "@/components/ui/LoadingShimmer";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MetricItem { label: string; value: string }

interface PitchSlides {
  title?: { company?: string; tagline?: string; presenter?: string; date?: string };
  problem?: { headline?: string; points?: string[]; market_pain?: string; speaker_notes?: string };
  solution?: { headline?: string; description?: string; differentiators?: string[]; speaker_notes?: string };
  traction?: { headline?: string; metrics?: MetricItem[]; highlights?: string[]; speaker_notes?: string };
  market?: { headline?: string; tam?: string; sam?: string; som?: string; growth_rate?: string; speaker_notes?: string };
  product?: { headline?: string; features?: string[]; tech_stack?: string; speaker_notes?: string };
  business_model?: { headline?: string; revenue_streams?: string[]; unit_economics?: string; speaker_notes?: string };
  team?: { headline?: string; note?: string; speaker_notes?: string };
  financials?: { headline?: string; mrr?: string; arr?: string; growth?: string; burn?: string; runway?: string; ask?: string; speaker_notes?: string };
  ask?: { headline?: string; amount?: string; use_of_funds?: string[]; milestones?: string[]; speaker_notes?: string };
}

interface PitchDeckArtifactProps {
  documentId: string;
  slides: PitchSlides;
  companyName?: string;
  isLoading?: boolean;
}

// ─── Slide config ─────────────────────────────────────────────────────────────

const SLIDE_KEYS: { key: keyof PitchSlides; label: string }[] = [
  { key: "title",         label: "Title" },
  { key: "problem",       label: "Problem" },
  { key: "solution",      label: "Solution" },
  { key: "traction",      label: "Traction" },
  { key: "market",        label: "Market" },
  { key: "product",       label: "Product" },
  { key: "business_model", label: "Business Model" },
  { key: "team",          label: "Team" },
  { key: "financials",    label: "Financials" },
  { key: "ask",           label: "The Ask" },
];

const str = (v: unknown): string =>
  typeof v === "string" ? v : typeof v === "number" ? String(v) : "";

const bulletList = (v: unknown): string[] =>
  Array.isArray(v) ? v.map((x) => str(x)) : [];

// ─── Slide Renderers ──────────────────────────────────────────────────────────

function SlideTitle({ data }: { data: PitchSlides["title"] }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
      <p className="system-label" style={{ color: "var(--text-3)" }}>Deck · Confidential</p>
      <h1
        className="font-display uppercase tracking-[0.05em] leading-none"
        style={{ fontSize: "clamp(36px, 5vw, 56px)", color: "var(--text-1)" }}
      >
        {data?.company ?? "Company"}
      </h1>
      {data?.tagline && (
        <p className="font-comfortaa text-[14px] max-w-md" style={{ color: "var(--text-2)" }}>
          {data.tagline}
        </p>
      )}
      {(data?.presenter || data?.date) && (
        <p className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: "var(--text-3)" }}>
          {[data.presenter, data.date].filter(Boolean).join("  ·  ")}
        </p>
      )}
    </div>
  );
}

function SlideMetricGrid({ metrics }: { metrics: MetricItem[] }) {
  return (
    <div
      className="grid gap-2"
      style={{ gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", marginTop: 8 }}
    >
      {metrics.map((m, i) => (
        <div
          key={i}
          className="panel p-3 flex flex-col gap-1 items-center text-center"
          style={{ background: "var(--surface-hi)" }}
        >
          <span
            className="font-display uppercase tracking-wider leading-none"
            style={{ fontSize: 22, color: "var(--green)" }}
          >
            {m.value}
          </span>
          <span className="system-label" style={{ color: "var(--text-3)" }}>
            {m.label}
          </span>
        </div>
      ))}
    </div>
  );
}

function SlideTraction({ data }: { data: PitchSlides["traction"] }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="font-comfortaa text-[13px]" style={{ color: "var(--text-2)" }}>
        {data?.headline}
      </p>
      {data?.metrics && data.metrics.length > 0 && (
        <SlideMetricGrid metrics={data.metrics} />
      )}
      {bulletList(data?.highlights).map((h, i) => (
        <p key={i} className="font-comfortaa text-[13px] flex items-start gap-2" style={{ color: "var(--text-2)" }}>
          <span style={{ color: "var(--green)", flexShrink: 0 }}>›</span> {h}
        </p>
      ))}
    </div>
  );
}

function SlideMarket({ data }: { data: PitchSlides["market"] }) {
  const markets = [
    { label: "TAM", value: data?.tam },
    { label: "SAM", value: data?.sam },
    { label: "SOM", value: data?.som },
  ].filter(({ value }) => value);
  return (
    <div className="flex flex-col gap-3">
      {data?.headline && (
        <p className="font-comfortaa text-[13px]" style={{ color: "var(--text-2)" }}>{data.headline}</p>
      )}
      <div className="grid grid-cols-3 gap-2">
        {markets.map(({ label, value }) => (
          <div
            key={label}
            className="panel p-3 flex flex-col gap-1"
            style={{ borderColor: "rgba(0,255,136,0.15)" }}
          >
            <span className="system-label" style={{ color: "var(--green)" }}>{label}</span>
            <span className="font-display text-xl uppercase" style={{ color: "var(--text-1)" }}>{value}</span>
          </div>
        ))}
      </div>
      {data?.growth_rate && (
        <p className="font-mono text-[11px] uppercase tracking-[0.14em]" style={{ color: "var(--text-3)" }}>
          Growth Rate: <span style={{ color: "var(--green)" }}>{data.growth_rate}</span>
        </p>
      )}
    </div>
  );
}

function SlideFinancials({ data }: { data: PitchSlides["financials"] }) {
  const rows = [
    { label: "MRR", value: data?.mrr },
    { label: "ARR", value: data?.arr },
    { label: "Growth", value: data?.growth },
    { label: "Monthly Burn", value: data?.burn },
    { label: "Runway", value: data?.runway },
    { label: "Ask", value: data?.ask },
  ].filter(({ value }) => value);

  return (
    <div className="grid grid-cols-2 gap-2">
      {rows.map(({ label, value }) => (
        <div
          key={label}
          className="panel p-3 flex flex-col gap-0.5"
          style={{ background: "var(--surface-hi)" }}
        >
          <span className="system-label">{label}</span>
          <span className="font-display text-xl uppercase leading-tight" style={{ color: "var(--text-1)" }}>
            {value}
          </span>
        </div>
      ))}
    </div>
  );
}

function SlideAsk({ data }: { data: PitchSlides["ask"] }) {
  return (
    <div className="flex flex-col gap-3">
      {data?.amount && (
        <p
          className="font-display uppercase tracking-wider"
          style={{ fontSize: "clamp(28px,4vw,40px)", color: "var(--green)", lineHeight: 1 }}
        >
          {data.amount}
        </p>
      )}
      {bulletList(data?.use_of_funds).length > 0 && (
        <>
          <p className="system-label" style={{ color: "var(--text-3)" }}>Use of Funds</p>
          {bulletList(data?.use_of_funds).map((f, i) => (
            <p key={i} className="font-comfortaa text-[13px] flex items-start gap-2" style={{ color: "var(--text-2)" }}>
              <span style={{ color: "var(--violet)", flexShrink: 0 }}>›</span> {f}
            </p>
          ))}
        </>
      )}
      {bulletList(data?.milestones).length > 0 && (
        <>
          <p className="system-label mt-2" style={{ color: "var(--text-3)" }}>Milestones</p>
          {bulletList(data?.milestones).map((m, i) => (
            <p key={i} className="font-comfortaa text-[13px] flex items-start gap-2" style={{ color: "var(--text-2)" }}>
              <span style={{ color: "var(--green)", flexShrink: 0 }}>›</span> {m}
            </p>
          ))}
        </>
      )}
    </div>
  );
}

function SlideGeneric({ data }: { data: Record<string, unknown> }) {
  const bullets = bulletList(
    data.points ?? data.features ?? data.differentiators ?? data.revenue_streams ?? [],
  );
  const body =
    str(data.description) ||
    str(data.market_pain) ||
    str(data.unit_economics) ||
    str(data.note) ||
    (data.tech_stack ? `Tech: ${str(data.tech_stack)}` : "");

  const headlineStr = str(data.headline);
  return (
    <div className="flex flex-col gap-3">
      {Boolean(headlineStr) && (
        <p className="font-comfortaa text-[13px]" style={{ color: "var(--text-2)" }}>
          {headlineStr}
        </p>
      )}
      {body && (
        <p className="font-comfortaa text-[13px] leading-[1.7]" style={{ color: "var(--text-2)" }}>
          {body}
        </p>
      )}
      {bullets.map((b, i) => (
        <p key={i} className="font-comfortaa text-[13px] flex items-start gap-2" style={{ color: "var(--text-2)" }}>
          <span style={{ color: "var(--green)", flexShrink: 0 }}>›</span> {b}
        </p>
      ))}
    </div>
  );
}

function SpeakerNotes({ notes }: { notes: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t border-[var(--border)]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-2.5"
        style={{ background: "none", border: "none", cursor: "pointer" }}
      >
        <span className="system-label">Speaker Notes</span>
        {open ? <ChevronUp size={11} style={{ color: "var(--text-3)" }} /> : <ChevronDown size={11} style={{ color: "var(--text-3)" }} />}
      </button>
      {open && (
        <p
          className="px-4 pb-3 font-comfortaa text-[12px] leading-[1.65]"
          style={{ color: "var(--text-3)", fontStyle: "italic" }}
        >
          {notes}
        </p>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function PitchDeckArtifact({
  documentId,
  slides,
  companyName = "Company",
  isLoading = false,
}: PitchDeckArtifactProps) {
  const [current, setCurrent] = useState(0);
  const total = SLIDE_KEYS.length;
  const { key: slideKey, label: slideLabel } = SLIDE_KEYS[current];

  const fileBase = `${companyName.replace(/\s+/g, "-").toLowerCase()}-pitch-deck`;
  const exporter = useFinanceExport({ documentId, fileBaseName: fileBase });

  const prev = () => setCurrent((s) => Math.max(0, s - 1));
  const next = () => setCurrent((s) => Math.min(total - 1, s + 1));

  // Speaker notes (optional per slide)
  const slideData = slides[slideKey] as Record<string, unknown> | undefined;
  const speakerNotes = str(slideData?.speaker_notes);

  // ─── Loading skeleton ─────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="panel flex flex-col gap-0 overflow-hidden anim-fade-in">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <div className="flex items-center gap-3">
            <LoadingShimmer className="h-7 w-7 rounded" />
            <LoadingShimmer className="h-3.5 w-36" />
          </div>
          <LoadingShimmer className="h-8 w-28" />
        </div>
        <div className="flex justify-center gap-1.5 border-b border-[var(--border)] px-5 py-3">
          {SLIDE_KEYS.map((_, i) => <LoadingShimmer key={i} className="h-1 w-6" />)}
        </div>
        <div className="p-6 min-h-[280px] flex flex-col gap-3">
          <LoadingShimmer className="h-3 w-24" />
          <LoadingShimmer className="h-8 w-56" />
          <LoadingShimmer className="h-3 w-full" />
          <LoadingShimmer className="h-3 w-4/5" />
        </div>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <div className="panel flex flex-col gap-0 overflow-hidden anim-fade-in">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div
        className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-4"
        style={{ background: "var(--surface)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-8 w-8 items-center justify-center rounded"
            style={{
              background: "rgba(123,97,255,0.08)",
              border: "1px solid rgba(123,97,255,0.2)",
              color: "var(--violet)",
            }}
          >
            <Presentation size={14} />
          </div>
          <div>
            <p className="font-comfortaa text-[13px] font-semibold" style={{ color: "var(--text-1)" }}>
              {companyName} — Pitch Deck
            </p>
            <p className="font-mono text-[9px] uppercase tracking-[0.2em]" style={{ color: "var(--text-3)" }}>
              {documentId.slice(0, 8)}…
            </p>
          </div>
        </div>

        <button
          id="export-pptx-btn"
          type="button"
          className="button-ghost"
          style={{ padding: "8px 14px", fontSize: 10, minHeight: 34, gap: 6 }}
          onClick={() => exporter.triggerDownload("pptx")}
          disabled={exporter.isLoading("pptx")}
        >
          {exporter.isLoading("pptx") ? (
            <Loader2 size={11} className="animate-spin" />
          ) : (
            <Download size={11} />
          )}
          {exporter.isLoading("pptx") ? "Exporting…" : "Download PPTX"}
        </button>
      </div>

      {/* Export error */}
      {exporter.error("pptx") && (
        <div
          className="flex items-center gap-2 border-b border-[var(--border)] px-5 py-2"
          style={{ background: "rgba(255,107,53,0.07)", fontSize: 11 }}
        >
          <span className="font-mono text-[11px]" style={{ color: "var(--ember)", letterSpacing: "0.05em" }}>
            {exporter.error("pptx")}
          </span>
          <button
            type="button"
            onClick={() => exporter.clearError("pptx")}
            style={{ color: "var(--text-3)", background: "none", border: "none", cursor: "pointer", marginLeft: "auto" }}
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Slide Dot Navigator ─────────────────────────────────────── */}
      <div
        className="flex items-center justify-center gap-1.5 border-b border-[var(--border)] px-5 py-3 flex-wrap"
        style={{ background: "var(--surface-hi)" }}
      >
        {SLIDE_KEYS.map(({ label }, i) => (
          <button
            key={i}
            type="button"
            title={label}
            onClick={() => setCurrent(i)}
            style={{
              height: 3,
              width: i === current ? 28 : 18,
              borderRadius: 2,
              border: "none",
              cursor: "pointer",
              background: i === current ? "var(--green)" : "var(--border-hi)",
              transition: "width 0.2s ease, background 0.2s ease",
              padding: 0,
            }}
          />
        ))}
      </div>

      {/* ── Slide Canvas ────────────────────────────────────────────── */}
      <div className="min-h-[280px] px-6 pt-5 pb-4 anim-fade-in" key={current}>
        {/* Slide counter + label */}
        <div className="mb-4 flex items-center justify-between">
          <span
            className="font-mono text-[9px] uppercase tracking-[0.25em]"
            style={{ color: "var(--green)" }}
          >
            {slideLabel}
          </span>
          <span className="system-label">
            {current + 1} of {total}
          </span>
        </div>

        {/* Slide-specific renderer */}
        {slideKey === "title" && <SlideTitle data={slides.title} />}
        {slideKey === "traction" && <SlideTraction data={slides.traction} />}
        {slideKey === "market" && <SlideMarket data={slides.market} />}
        {slideKey === "financials" && <SlideFinancials data={slides.financials} />}
        {slideKey === "ask" && <SlideAsk data={slides.ask} />}
        {!["title", "traction", "market", "financials", "ask"].includes(slideKey) && (
          <SlideGeneric data={(slides[slideKey] as Record<string, unknown> | undefined) ?? {}} />
        )}
      </div>

      {/* ── Speaker Notes ────────────────────────────────────────────── */}
      {speakerNotes && <SpeakerNotes notes={speakerNotes} />}

      {/* ── Navigation Controls ──────────────────────────────────────── */}
      <div
        className="flex items-center gap-3 border-t border-[var(--border)] px-5 py-3"
        style={{ background: "var(--surface)" }}
      >
        <button
          id="prev-slide-btn"
          type="button"
          className="button-ghost"
          style={{ padding: "6px 12px", fontSize: 10, minHeight: 30, gap: 4 }}
          onClick={prev}
          disabled={current === 0}
        >
          <ChevronLeft size={12} />
          Prev
        </button>

        {/* Progress bar */}
        <div
          className="flex-1 overflow-hidden rounded-full"
          style={{ height: 2, background: "var(--border-hi)" }}
        >
          <div
            className="h-full rounded-full"
            style={{
              width: `${((current + 1) / total) * 100}%`,
              background: "var(--green)",
              transition: "width 0.3s ease",
            }}
          />
        </div>

        <button
          id="next-slide-btn"
          type="button"
          className="button-ghost"
          style={{ padding: "6px 12px", fontSize: 10, minHeight: 30, gap: 4 }}
          onClick={next}
          disabled={current === total - 1}
        >
          Next
          <ChevronRight size={12} />
        </button>
      </div>
    </div>
  );
}

export default PitchDeckArtifact;
