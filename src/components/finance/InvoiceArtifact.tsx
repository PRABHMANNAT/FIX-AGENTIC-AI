"use client";

import { useState, useRef, useEffect } from "react";
import {
  FileText,
  Download,
  AlertTriangle,
  Loader2,
  CheckCircle,
  Send,
} from "lucide-react";
import LoadingShimmer from "@/components/ui/LoadingShimmer";
import { useFinanceExport } from "@/hooks/useFinanceExport";
import type { Invoice } from "@/types/finance";

// ─── Props ────────────────────────────────────────────────────────────────────

interface InvoiceArtifactProps {
  invoice: Invoice;
  documentId: string;
  isLoading?: boolean;
  changedFields?: string[];
  onStatusChange?: (status: Invoice["status"]) => void;
}

// ─── Amount formatter — Indian number system ──────────────────────────────────

function fmtINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// ─── Flash hook (same pattern as InvestorReportArtifact.tsx) ─────────────────

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

// ─── useFieldFlash — returns true if fieldName is in changedFields ────────────

function useFieldFlash(fieldName: string, changedFields: string[]): boolean {
  const changed = changedFields.includes(fieldName);
  const [flashing, setFlashing] = useState(false);
  const prevRef = useRef(changed);

  useEffect(() => {
    if (changed && !prevRef.current) {
      setFlashing(true);
      const t = setTimeout(() => setFlashing(false), 900);
      prevRef.current = false;
      return () => clearTimeout(t);
    }
    if (!changed) prevRef.current = false;
  }, [changed]);

  return flashing;
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<Invoice["status"], { label: string; borderColor: string; color: string }> = {
  draft:  { label: "Draft",  borderColor: "var(--border-hi)",          color: "var(--text-2)" },
  final:  { label: "Final",  borderColor: "rgba(123,97,255,0.35)",     color: "var(--violet)" },
  sent:   { label: "Sent",   borderColor: "rgba(0,255,136,0.35)",      color: "var(--green)" },
  paid:   { label: "Paid",   borderColor: "rgba(0,255,136,0.55)",      color: "var(--green)" },
};

// ─── Inline error banner ──────────────────────────────────────────────────────

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

// ─── FlashCell — wraps any element and flashes green if field is changed ──────

function FlashWrap({
  children,
  flash,
  className,
}: {
  children: React.ReactNode;
  flash: boolean;
  className?: string;
}) {
  return (
    <span
      className={`transition-colors duration-700 ${className ?? ""}`}
      style={
        flash
          ? { background: "rgba(0,255,136,0.08)", borderRadius: 3, padding: "1px 4px" }
          : {}
      }
    >
      {children}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function InvoiceArtifact({
  invoice,
  documentId,
  isLoading = false,
  changedFields = [],
  onStatusChange,
}: InvoiceArtifactProps) {
  const fileBase = `${invoice.invoice_number ?? "invoice"}`;
  const exporter = useFinanceExport({ documentId, fileBaseName: fileBase });

  const [statusUpdating, setStatusUpdating] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  // ── Field-level flash tracking ─────────────────────────────────────────
  const totalFlash    = useFlash(invoice.total);
  const subtotalFlash = useFlash(invoice.subtotal);
  const toCompanyFlash = useFieldFlash("to_company", changedFields);
  const lineItemsFlash = useFieldFlash("line_items", changedFields);
  const discountFlash  = useFieldFlash("discount_percent", changedFields);
  const notesFlash     = useFieldFlash("notes", changedFields);
  const bankFlash      = useFieldFlash("bank_details", changedFields);

  // ── Status change helper ──────────────────────────────────────────────
  const handleStatusChange = async (newStatus: Invoice["status"]) => {
    setStatusUpdating(true);
    setStatusError(null);
    try {
      const res = await fetch("/api/finance/invoice/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userMessage: `Change the status to "${newStatus}"`,
          existingInvoice: invoice,
          documentId,
        }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(json.error ?? "Status update failed.");
      }
      onStatusChange?.(newStatus);
    } catch (e) {
      setStatusError(e instanceof Error ? e.message : "Status update failed.");
    } finally {
      setStatusUpdating(false);
    }
  };

  // ── Loading skeleton ──────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="panel flex flex-col gap-0 overflow-hidden anim-fade-in">
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
          </div>
        </div>
        <div className="flex flex-col gap-3 p-5">
          <div className="grid grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              {[0, 1, 2, 3].map((i) => <LoadingShimmer key={i} className="h-3 w-full" />)}
            </div>
            <div className="flex flex-col gap-2 items-end">
              {[0, 1, 2].map((i) => <LoadingShimmer key={i} className="h-3 w-32" />)}
            </div>
          </div>
          <div className="mt-4">
            {[0, 1, 2, 3].map((i) => <LoadingShimmer key={i} className="h-8 w-full mb-2" />)}
          </div>
          <div className="flex justify-end mt-2">
            <div className="flex flex-col gap-2 w-48">
              {[0, 1, 2, 3].map((i) => <LoadingShimmer key={i} className="h-3 w-full" />)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────
  const statusStyle = STATUS_STYLES[invoice.status] ?? STATUS_STYLES.draft;

  return (
    <div className="panel flex flex-col gap-0 overflow-hidden anim-fade-in">

      {/* ── Toolbar ─────────────────────────────────────────────────── */}
      <div
        className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-3"
        style={{ background: "var(--surface)" }}
      >
        {/* Status badge + status actions */}
        <div className="flex items-center gap-3">
          <div
            className="flex h-8 w-8 items-center justify-center rounded"
            style={{ background: "rgba(123,97,255,0.08)", border: "1px solid rgba(123,97,255,0.2)", color: "var(--violet)" }}
          >
            <FileText size={14} />
          </div>

          {/* Status pill */}
          <span
            className="agent-status-pill"
            style={{ borderColor: statusStyle.borderColor, color: statusStyle.color }}
          >
            {statusStyle.label}
          </span>

          {/* Status advance buttons */}
          {invoice.status !== "sent" && invoice.status !== "paid" && (
            <button
              type="button"
              id="mark-sent-btn"
              className="button-ghost"
              style={{ padding: "5px 12px", fontSize: 10, minHeight: 30, gap: 5 }}
              onClick={() => handleStatusChange("sent")}
              disabled={statusUpdating}
            >
              {statusUpdating ? <Loader2 size={10} className="animate-spin" /> : <Send size={10} />}
              Mark as Sent
            </button>
          )}
          {invoice.status !== "paid" && (
            <button
              type="button"
              id="mark-paid-btn"
              className="button-ghost"
              style={{
                padding: "5px 12px",
                fontSize: 10,
                minHeight: 30,
                gap: 5,
                borderColor: "rgba(0,255,136,0.3)",
                color: "var(--green)",
              }}
              onClick={() => handleStatusChange("paid")}
              disabled={statusUpdating}
            >
              {statusUpdating ? <Loader2 size={10} className="animate-spin" /> : <CheckCircle size={10} />}
              Mark as Paid
            </button>
          )}
        </div>

        {/* Export buttons */}
        <div className="flex items-center gap-2">
          {(["pdf", "docx"] as const).map((fmt_) => (
            <button
              key={fmt_}
              type="button"
              id={`invoice-export-${fmt_}-btn`}
              className="button-ghost"
              style={{ padding: "6px 14px", fontSize: 10, minHeight: 30, gap: 5 }}
              onClick={() => exporter.triggerDownload(fmt_)}
              disabled={exporter.isLoading(fmt_) || exporter.anyLoading}
            >
              {exporter.isLoading(fmt_) ? (
                <Loader2 size={10} className="animate-spin" />
              ) : (
                <Download size={10} />
              )}
              {exporter.isLoading(fmt_) ? "Exporting…" : fmt_.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Errors */}
      {statusError && <InlineError message={statusError} onDismiss={() => setStatusError(null)} />}
      {exporter.error("pdf") && <InlineError message={exporter.error("pdf")!} onDismiss={() => exporter.clearError("pdf")} />}
      {exporter.error("docx") && <InlineError message={exporter.error("docx")!} onDismiss={() => exporter.clearError("docx")} />}

      {/* ── Invoice Body ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-0 p-5">

        {/* ── Section 1: Header ─────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-6 border-b border-[var(--border)] pb-5 mb-5">
          {/* Left: sender info */}
          <div className="flex flex-col gap-1">
            <p className="font-comfortaa text-[15px] font-bold leading-tight" style={{ color: "var(--text-1)" }}>
              {invoice.from_company || "—"}
            </p>
            <p className="font-comfortaa text-[12px] whitespace-pre-line" style={{ color: "var(--text-2)", lineHeight: 1.55 }}>
              {invoice.from_address}
            </p>
            {invoice.from_gstin && (
              <p className="font-mono text-[10px] mt-1" style={{ color: "var(--text-3)" }}>
                GSTIN: <span style={{ color: "var(--text-2)" }}>{invoice.from_gstin}</span>
              </p>
            )}
          </div>
          {/* Right: invoice meta */}
          <div className="flex flex-col items-end gap-1 text-right">
            <p
              className="font-display text-[22px] uppercase tracking-[0.12em] leading-none"
              style={{ color: "var(--text-1)" }}
            >
              Tax Invoice
            </p>
            <p className="font-mono text-[11px] mt-2" style={{ color: "var(--text-2)" }}>
              <span className="system-label">No&nbsp;</span>
              {invoice.invoice_number}
            </p>
            <p className="font-mono text-[11px]" style={{ color: "var(--text-2)" }}>
              <span className="system-label">Date&nbsp;</span>
              {invoice.date}
            </p>
            <p className="font-mono text-[11px]" style={{ color: "var(--text-2)" }}>
              <span className="system-label">Due&nbsp;</span>
              {invoice.due_date}
            </p>
          </div>
        </div>

        {/* ── Section 2: Bill To ────────────────────────────────────── */}
        <div
          className={`border-b border-[var(--border)] pb-4 mb-5 transition-colors duration-700 ${toCompanyFlash ? "bg-[rgba(0,255,136,0.04)] rounded p-2" : ""}`}
        >
          <p className="system-label mb-1">Bill To</p>
          <p className="font-comfortaa text-[14px] font-semibold" style={{ color: "var(--text-1)" }}>
            {invoice.to_company || "—"}
          </p>
          <p className="font-comfortaa text-[12px] whitespace-pre-line" style={{ color: "var(--text-2)", lineHeight: 1.55 }}>
            {invoice.to_address}
          </p>
          {invoice.to_gstin && (
            <p className="font-mono text-[10px] mt-1" style={{ color: "var(--text-3)" }}>
              GSTIN: <span style={{ color: "var(--text-2)" }}>{invoice.to_gstin}</span>
            </p>
          )}
        </div>

        {/* ── Section 3: Line Items table ───────────────────────────── */}
        <div
          className={`overflow-x-auto border-b border-[var(--border)] pb-4 mb-4 transition-colors duration-700 ${lineItemsFlash ? "bg-[rgba(0,255,136,0.04)] rounded" : ""}`}
        >
          <table className="w-full whitespace-nowrap md:whitespace-normal" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-hi)" }}>
                {["Sr", "Description", "Qty", "Rate (₹)", "Amount (₹)"].map((h, i) => (
                  <th
                    key={h}
                    className="system-label py-2"
                    style={{
                      textAlign: i < 2 ? "left" : "right",
                      paddingRight: i === 4 ? 0 : 12,
                      paddingLeft: i === 0 ? 0 : undefined,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoice.line_items.map((item, i) => (
                <tr
                  key={i}
                  style={{ borderBottom: "1px solid var(--border)" }}
                >
                  <td className="font-mono text-[11px] py-2.5" style={{ color: "var(--text-3)", paddingRight: 12, width: 28 }}>
                    {i + 1}
                  </td>
                  <td className="font-comfortaa text-[13px] py-2.5" style={{ color: "var(--text-1)", paddingRight: 12 }}>
                    {item.description}
                  </td>
                  <td className="font-mono text-[12px] py-2.5 text-right" style={{ color: "var(--text-2)", paddingRight: 12, width: 50 }}>
                    {item.quantity}
                  </td>
                  <td className="font-mono text-[12px] py-2.5 text-right" style={{ color: "var(--text-2)", paddingRight: 12, width: 90 }}>
                    {fmtINR(item.rate)}
                  </td>
                  <td className="font-mono text-[12px] py-2.5 text-right" style={{ color: "var(--text-1)", width: 100 }}>
                    {fmtINR(item.amount)}
                  </td>
                </tr>
              ))}
              {/* Subtotal row */}
              <tr>
                <td colSpan={4} className="py-2.5 text-right font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: "var(--text-3)" }}>
                  Subtotal
                </td>
                <td className="py-2.5 text-right font-mono text-[13px] font-semibold" style={{ color: "var(--text-1)" }}>
                  <FlashWrap flash={subtotalFlash}>
                    {fmtINR(invoice.subtotal)}
                  </FlashWrap>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ── Section 4: Tax Breakdown (right-aligned) ──────────────── */}
        <div className="flex justify-end mb-5 border-b border-[var(--border)] pb-5">
          <div className="flex flex-col gap-1.5 min-w-[220px]">
            {/* Discount */}
            {invoice.discount_percent > 0 && (
              <div
                className={`flex justify-between gap-8 transition-colors duration-700 ${discountFlash ? "bg-[rgba(255,107,53,0.06)] rounded px-2" : ""}`}
              >
                <span className="font-mono text-[11px] uppercase tracking-[0.1em]" style={{ color: "var(--text-3)" }}>
                  Discount ({invoice.discount_percent}%)
                </span>
                <span className="font-mono text-[12px]" style={{ color: "var(--ember)" }}>
                  −{fmtINR(invoice.discount_amount)}
                </span>
              </div>
            )}

            {/* CGST + SGST */}
            {invoice.cgst_percent > 0 && (
              <>
                <div className="flex justify-between gap-8">
                  <span className="font-mono text-[11px] uppercase tracking-[0.1em]" style={{ color: "var(--text-3)" }}>
                    CGST ({invoice.cgst_percent}%)
                  </span>
                  <span className="font-mono text-[12px]" style={{ color: "var(--text-2)" }}>
                    {fmtINR(invoice.cgst_amount)}
                  </span>
                </div>
                <div className="flex justify-between gap-8">
                  <span className="font-mono text-[11px] uppercase tracking-[0.1em]" style={{ color: "var(--text-3)" }}>
                    SGST ({invoice.sgst_percent}%)
                  </span>
                  <span className="font-mono text-[12px]" style={{ color: "var(--text-2)" }}>
                    {fmtINR(invoice.sgst_amount)}
                  </span>
                </div>
              </>
            )}

            {/* IGST */}
            {invoice.igst_percent > 0 && (
              <div className="flex justify-between gap-8">
                <span className="font-mono text-[11px] uppercase tracking-[0.1em]" style={{ color: "var(--text-3)" }}>
                  IGST ({invoice.igst_percent}%)
                </span>
                <span className="font-mono text-[12px]" style={{ color: "var(--text-2)" }}>
                  {fmtINR(invoice.igst_amount)}
                </span>
              </div>
            )}

            {/* Divider */}
            <div className="my-1 h-px" style={{ background: "var(--border-hi)" }} />

            {/* Total */}
            <div className="flex justify-between gap-8 items-baseline">
              <span className="font-mono text-[12px] font-bold uppercase tracking-[0.14em]" style={{ color: "var(--text-1)" }}>
                Total
              </span>
              <span
                className={`font-display text-[20px] uppercase transition-colors duration-700 ${totalFlash ? "text-[var(--green)]" : ""}`}
                style={!totalFlash ? { color: "var(--text-1)" } : {}}
              >
                {fmtINR(invoice.total)}
              </span>
            </div>
          </div>
        </div>

        {/* ── Section 5: Footer ─────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-6">
          {/* Left: Notes + Payment Terms */}
          <div className="flex flex-col gap-3">
            {invoice.notes && (
              <div
                className={`transition-colors duration-700 ${notesFlash ? "bg-[rgba(0,255,136,0.04)] rounded p-2" : ""}`}
              >
                <p className="system-label mb-1">Notes</p>
                <p className="font-comfortaa text-[12px] whitespace-pre-line" style={{ color: "var(--text-2)", lineHeight: 1.6 }}>
                  {invoice.notes}
                </p>
              </div>
            )}
            {invoice.payment_terms && (
              <div>
                <p className="system-label mb-1">Payment Terms</p>
                <p className="font-comfortaa text-[12px]" style={{ color: "var(--text-2)" }}>
                  {invoice.payment_terms}
                </p>
              </div>
            )}
          </div>

          {/* Right: Bank Details */}
          {invoice.bank_details && (
            <div
              className={`transition-colors duration-700 ${bankFlash ? "bg-[rgba(0,255,136,0.04)] rounded p-2" : ""}`}
            >
              <p className="system-label mb-1">Bank Details</p>
              <p className="font-mono text-[11px] whitespace-pre-line" style={{ color: "var(--text-2)", lineHeight: 1.7 }}>
                {invoice.bank_details}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default InvoiceArtifact;
