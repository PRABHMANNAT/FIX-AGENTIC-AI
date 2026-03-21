"use client";

import { Loader2, Target } from "lucide-react";

interface FinderFormState {
  idealCustomer: string;
  linkedinQuery: string;
  emailHook: string;
  geography: string;
  leadCount: string;
}

interface FinderPanelProps {
  form: FinderFormState;
  onChange: (field: keyof FinderFormState, value: string) => void;
  onSubmit: () => void;
  loading: boolean;
  progressMessage?: string | null;
  error?: string | null;
}

export function FinderPanel({
  form,
  onChange,
  onSubmit,
  loading,
  progressMessage,
  error,
}: FinderPanelProps) {
  return (
    <aside className="panel panel-tint-pink grid-surface h-fit p-5">
      <div className="system-label text-text-muted">Who Are Your Customers?</div>
      <div className="mt-4 space-y-4">
        <label className="space-y-2">
          <span className="system-label text-text-muted">Your Ideal Customer</span>
          <textarea
            value={form.idealCustomer}
            onChange={(event) => onChange("idealCustomer", event.target.value)}
            className="input-shell h-32 w-full resize-none"
          />
        </label>
        <label className="space-y-2">
          <span className="system-label text-text-muted">Where To Look On LinkedIn</span>
          <input
            value={form.linkedinQuery}
            onChange={(event) => onChange("linkedinQuery", event.target.value)}
            className="input-shell w-full"
          />
        </label>
        <label className="space-y-2">
          <span className="system-label text-text-muted">Best Email Angle</span>
          <textarea
            value={form.emailHook}
            onChange={(event) => onChange("emailHook", event.target.value)}
            className="input-shell h-24 w-full resize-none"
          />
        </label>
        <label className="space-y-2">
          <span className="system-label text-text-muted">Area</span>
          <input
            value={form.geography}
            onChange={(event) => onChange("geography", event.target.value)}
            className="input-shell w-full"
          />
        </label>
        <label className="space-y-2">
          <span className="system-label text-text-muted">How Many Customers?</span>
          <select
            value={form.leadCount}
            onChange={(event) => onChange("leadCount", event.target.value)}
            className="input-shell w-full"
          >
            <option value="10">10</option>
            <option value="25">25</option>
            <option value="50">50</option>
          </select>
        </label>

        {error ? <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-danger">{error}</div> : null}
        {progressMessage ? (
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-secondary">
            {progressMessage}
          </div>
        ) : null}

        <button type="button" onClick={onSubmit} className="button-primary w-full justify-center" disabled={loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
          ) : (
            <Target className="h-4 w-4" strokeWidth={2} />
          )}
          Find Customers
        </button>
      </div>
    </aside>
  );
}

export default FinderPanel;
