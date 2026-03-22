"use client";

import { useState } from "react";
import { Loader2, Calendar, RefreshCw, Clock, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface Goal {
  goal_text: string;
  category: string;
  priority: number;
  time_allocation_target_percent: number;
  quarter: string;
}

interface Reflection {
  week_of: string;
  intended: string;
  actual: string;
  agent_insight: string;
}

interface AuditData {
  connected: boolean;
  last_synced: string | null;
  time_by_category: Record<string, number>;
  total_hours: number;
  deep_work_hours: number;
  deep_work_percent: number;
  avg_meeting_length: number;
  avg_attendees: number;
  days_without_deep_work: number;
  goals: Goal[];
  reflections: Reflection[];
}

interface TimeAuditProps {
  auditData: AuditData | null;
  isLoading: boolean;
  onConnect: () => void;
  onSync: () => void;
  onSaveReflection: (intended: string, actual: string) => void;
  isSyncing?: boolean;
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

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function TimeAudit({
  auditData,
  isLoading,
  onConnect,
  onSync,
  onSaveReflection,
  isSyncing = false,
}: TimeAuditProps) {
  const [intended, setIntended] = useState("");
  const [actual, setActual] = useState("");
  const [savingReflection, setSavingReflection] = useState(false);

  // LOADING STATE
  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-3)] mb-2">
          Time Audit
        </div>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface-hi)] p-4 space-y-3 animate-pulse"
          >
            <div className="h-6 w-32 rounded bg-[var(--border)]" />
            <div className="h-3 w-full rounded bg-[var(--border)]" />
            <div className="h-3 w-3/4 rounded bg-[var(--border)]" />
          </div>
        ))}
      </div>
    );
  }

  // NOT CONNECTED STATE
  if (!auditData?.connected) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8">
        <div className="panel flex flex-col items-center p-8 max-w-sm text-center space-y-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-hi)]">
            <Calendar size={22} className="text-[var(--text-3)]" />
          </div>
          <div>
            <h3 className="font-display text-[17px] text-[var(--text-1)] mb-2">
              Connect Google Calendar to see where your time goes
            </h3>
            <p className="font-mono text-[11px] text-[var(--text-3)] leading-relaxed">
              We analyze your calendar to show you deep work vs meetings, goal
              alignment, and time drift. Read-only access.
            </p>
          </div>
          <button
            type="button"
            onClick={onConnect}
            className="rounded bg-[var(--violet)] px-5 py-2.5 text-[13px] font-mono text-white hover:brightness-110 transition-all"
          >
            Connect Calendar
          </button>
          <p className="font-mono text-[10px] text-[var(--text-3)]">
            Read-only · No modifications
          </p>
        </div>
      </div>
    );
  }

  const data = auditData!;
  const totalHours = data.total_hours || 0;

  // Deep work status
  const deepWorkStatus =
    data.deep_work_percent >= 40
      ? { label: "Healthy focus time", color: "var(--green)" }
      : data.deep_work_percent >= 20
      ? { label: "Focus time is low", color: "var(--amber)" }
      : { label: "Critical — almost no deep work", color: "var(--ember)" };

  // Sort categories by hours desc
  const sortedCategories = Object.entries(data.time_by_category).sort(
    ([, a], [, b]) => b - a
  );

  const meetingStatus =
    data.avg_meeting_length < 30
      ? "var(--green)"
      : data.avg_meeting_length <= 45
      ? "var(--amber)"
      : "var(--ember)";

  const attendeeStatus =
    data.avg_attendees < 4
      ? "var(--green)"
      : data.avg_attendees <= 6
      ? "var(--amber)"
      : "var(--ember)";

  return (
    <div className="flex flex-col gap-6 p-6 overflow-y-auto h-full">
      {/* SECTION 1 — Deep Work Hero */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-hi)] p-5 text-center">
        <div
          className="font-display text-[48px] font-bold leading-none"
          style={{ color: deepWorkStatus.color }}
        >
          {data.deep_work_hours}
        </div>
        <div className="font-mono text-[11px] text-[var(--text-3)] mt-1 mb-3">
          hrs of focused work this week
        </div>
        <span
          className="inline-block rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-widest border"
          style={{
            color: deepWorkStatus.color,
            borderColor: deepWorkStatus.color,
            background: `${deepWorkStatus.color}15`,
          }}
        >
          {deepWorkStatus.label}
        </span>
      </div>

      {/* SECTION 2 — Time by category */}
      <div>
        <h3 className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-3)] mb-3">
          This week's time
        </h3>
        <div className="space-y-2">
          {sortedCategories.length === 0 ? (
            <p className="font-mono text-[11px] text-[var(--text-3)]">
              No events found this week
            </p>
          ) : (
            sortedCategories.map(([cat, hrs]) => {
              const pct = totalHours > 0 ? (hrs / totalHours) * 100 : 0;
              return (
                <div key={cat} className="flex items-center gap-3">
                  <span className="font-mono text-[11px] text-[var(--text-2)] w-28 shrink-0">
                    {cat}
                  </span>
                  <div className="flex-1 h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[var(--violet)]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="font-mono text-[11px] text-[var(--text-3)] w-12 text-right">
                    {hrs}h
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* SECTION 3 — Meeting quality */}
      <div>
        <h3 className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-3)] mb-3">
          Meeting quality
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-hi)] p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock size={12} className="text-[var(--text-3)]" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-3)]">
                Avg length
              </span>
            </div>
            <div
              className="font-display text-[22px] font-bold"
              style={{ color: meetingStatus }}
            >
              {data.avg_meeting_length}
            </div>
            <div className="font-mono text-[10px] text-[var(--text-3)]">
              min · Target: &lt;30 min
            </div>
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-hi)] p-4">
            <div className="flex items-center gap-2 mb-1">
              <Users size={12} className="text-[var(--text-3)]" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-3)]">
                Avg attendees
              </span>
            </div>
            <div
              className="font-display text-[22px] font-bold"
              style={{ color: attendeeStatus }}
            >
              {data.avg_attendees}
            </div>
            <div className="font-mono text-[10px] text-[var(--text-3)]">
              people · Target: &lt;4
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 4 — Goal alignment */}
      {data.goals.length > 0 && (
        <div>
          <h3 className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-3)] mb-3">
            Goal alignment this week
          </h3>
          <div className="space-y-2">
            {data.goals.map((goal, i) => {
              const actualHrs = data.time_by_category[goal.category] || 0;
              const actualPct =
                totalHours > 0 ? Math.round((actualHrs / totalHours) * 100) : 0;
              const diff = actualPct - goal.time_allocation_target_percent;
              const status =
                Math.abs(diff) <= 10
                  ? { label: "On track", color: "var(--green)" }
                  : Math.abs(diff) <= 25
                  ? { label: "Drifting", color: "var(--amber)" }
                  : { label: "Off track", color: "var(--ember)" };

              return (
                <div
                  key={i}
                  className="rounded-lg border border-[var(--border)] bg-[var(--surface-hi)] p-3 flex items-center justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] text-[var(--text-1)] truncate">
                      {goal.goal_text.substring(0, 60)}
                      {goal.goal_text.length > 60 ? "…" : ""}
                    </div>
                    <div className="font-mono text-[10px] text-[var(--text-3)]">
                      Target {goal.time_allocation_target_percent}% · Actual {actualPct}%
                    </div>
                  </div>
                  <span
                    className="font-mono text-[9px] uppercase tracking-widest shrink-0"
                    style={{ color: status.color }}
                  >
                    {status.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 5 — Weekly reflection */}
      <div>
        <h3 className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-3)] mb-1">
          Weekly reflection
        </h3>
        <p className="font-mono text-[10px] text-[var(--text-3)] mb-3">
          What did you intend vs what actually happened?
        </p>
        <div className="space-y-3">
          <textarea
            value={intended}
            onChange={(e) => setIntended(e.target.value)}
            placeholder="What I planned to focus on this week..."
            rows={2}
            className="w-full rounded border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[12px] text-[var(--text-1)] placeholder-[var(--text-3)] focus:border-[var(--violet)] focus:outline-none resize-none"
          />
          <textarea
            value={actual}
            onChange={(e) => setActual(e.target.value)}
            placeholder="What actually happened..."
            rows={2}
            className="w-full rounded border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[12px] text-[var(--text-1)] placeholder-[var(--text-3)] focus:border-[var(--violet)] focus:outline-none resize-none"
          />
          <button
            type="button"
            disabled={savingReflection || !intended.trim() || !actual.trim()}
            onClick={async () => {
              setSavingReflection(true);
              await onSaveReflection(intended, actual);
              setIntended("");
              setActual("");
              setSavingReflection(false);
            }}
            className="flex items-center gap-2 rounded bg-[var(--violet)] px-4 py-2 text-[12px] font-mono text-white hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {savingReflection && <Loader2 size={12} className="animate-spin" />}
            Save reflection
          </button>
        </div>

        {/* Past reflections */}
        {data.reflections.length > 0 && (
          <div className="mt-5">
            <h4 className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-3)] mb-2">
              Past reflections
            </h4>
            <div className="space-y-3">
              {data.reflections.slice(0, 3).map((r, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-[var(--border)] bg-[var(--surface-hi)] p-3 space-y-1.5"
                >
                  <div className="font-mono text-[10px] text-[var(--text-3)]">
                    {formatDate(r.week_of)}
                  </div>
                  <div className="text-[12px] text-[var(--text-2)] line-clamp-1">
                    <span className="text-[var(--text-3)]">Planned: </span>
                    {r.intended}
                  </div>
                  <div className="text-[12px] text-[var(--text-2)] line-clamp-1">
                    <span className="text-[var(--text-3)]">Actual: </span>
                    {r.actual}
                  </div>
                  {r.agent_insight && (
                    <div className="font-mono text-[10px] text-[var(--violet)] italic leading-relaxed border-t border-[var(--border)] pt-1.5">
                      {r.agent_insight}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* SECTION 6 — Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
        <span className="font-mono text-[10px] text-[var(--text-3)]">
          {data.last_synced
            ? `Last synced ${timeAgo(data.last_synced)}`
            : "Never synced"}
        </span>
        <button
          type="button"
          onClick={onSync}
          disabled={isSyncing}
          className={cn(
            "flex items-center gap-1.5 button-ghost px-3 py-1.5 text-[11px]",
            isSyncing && "opacity-50 cursor-not-allowed"
          )}
        >
          {isSyncing ? (
            <Loader2 size={11} className="animate-spin" />
          ) : (
            <RefreshCw size={11} />
          )}
          Sync now
        </button>
      </div>
    </div>
  );
}
