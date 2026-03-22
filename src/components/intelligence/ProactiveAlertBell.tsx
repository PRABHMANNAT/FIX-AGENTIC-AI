"use client";

import { useState, useRef, useEffect } from "react";
import { Bell, X, Check, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Alert {
  id: string;
  message: string;
  urgency: string;
  category: string;
  suggested_action: string;
  created_at: string;
  status: string;
}

interface ProactiveAlertBellProps {
  alerts: Alert[];
  unreadCount: number;
  onDismiss: (id: string) => void;
  onInvestigate: (alert: Alert) => void;
  onMarkAllRead: () => void;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function urgencyColor(urgency: string): string {
  return urgency === "high"
    ? "var(--ember)"
    : urgency === "medium"
    ? "var(--amber)"
    : "var(--cyan)";
}

export function ProactiveAlertBell({
  alerts,
  unreadCount,
  onDismiss,
  onInvestigate,
  onMarkAllRead,
}: ProactiveAlertBellProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const displayCount = unreadCount > 9 ? "9+" : String(unreadCount);

  return (
    <div ref={containerRef} className="relative">
      {/* BELL BUTTON */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="relative flex h-8 w-8 items-center justify-center rounded text-[var(--text-3)] hover:text-[var(--text-1)] transition-colors"
        title="Proactive alerts"
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--ember)] px-1 font-mono text-[9px] font-bold text-white leading-none">
            {displayCount}
          </span>
        )}
      </button>

      {/* DROPDOWN PANEL */}
      {open && (
        <div
          className="absolute right-0 top-10 z-50 w-80 rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-lg overflow-hidden"
        >
          {/* HEADER */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
            <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-2)] font-bold">
              Alerts
            </span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  onMarkAllRead();
                  setOpen(false);
                }}
                className="font-mono text-[10px] text-[var(--violet)] hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* EMPTY STATE */}
          {alerts.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-hi)]">
                <Check size={14} className="text-[var(--green)]" />
              </div>
              <span className="font-mono text-[11px] text-[var(--text-3)]">
                No alerts — all clear
              </span>
            </div>
          )}

          {/* ALERT LIST */}
          {alerts.length > 0 && (
            <div className="max-h-80 overflow-y-auto">
              {alerts.map((alert, i) => (
                <div
                  key={alert.id}
                  className={cn(
                    "flex items-start gap-3 px-4 py-3 hover:bg-[var(--surface-hi)] transition-colors",
                    i < alerts.length - 1 && "border-b border-[var(--border)]"
                  )}
                >
                  {/* Urgency dot */}
                  <div
                    className="mt-1.5 h-2 w-2 rounded-full shrink-0"
                    style={{ background: urgencyColor(alert.urgency) }}
                  />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] text-[var(--text-1)] leading-snug line-clamp-2">
                      {alert.message.length > 100
                        ? alert.message.substring(0, 100) + "…"
                        : alert.message}
                    </p>
                    <div className="font-mono text-[9px] text-[var(--text-3)] mt-0.5">
                      {alert.category} · {timeAgo(alert.created_at)}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        onInvestigate(alert);
                        setOpen(false);
                      }}
                      className="flex h-6 w-6 items-center justify-center rounded text-[var(--text-3)] hover:text-[var(--violet)] transition-colors"
                      title="Investigate"
                    >
                      <ArrowUpRight size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDismiss(alert.id)}
                      className="flex h-6 w-6 items-center justify-center rounded text-[var(--text-3)] hover:text-[var(--ember)] transition-colors"
                      title="Dismiss"
                    >
                      <X size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
