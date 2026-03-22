"use client";

import { useState, useEffect } from "react";
import { Loader2, X, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface Goal {
  goal_text: string;
  category: string;
  priority: number;
  time_allocation_target_percent: number;
  quarter: string;
}

interface GoalSetterProps {
  goals: Goal[];
  currentQuarter: string;
  onSave: (goals: Goal[]) => void;
  isLoading: boolean;
}

const CATEGORIES = [
  "Product",
  "Sales",
  "Team",
  "Finance",
  "Personal",
  "Marketing",
  "Operations",
];

function getQuarterOptions(): string[] {
  const now = new Date();
  const year = now.getFullYear();
  return [
    `Q1 ${year}`,
    `Q2 ${year}`,
    `Q3 ${year}`,
    `Q4 ${year}`,
  ];
}

export function GoalSetter({
  goals,
  currentQuarter,
  onSave,
  isLoading,
}: GoalSetterProps) {
  const [editableGoals, setEditableGoals] = useState<Goal[]>(goals);
  const [selectedQuarter, setSelectedQuarter] = useState(currentQuarter);
  const [totalPercent, setTotalPercent] = useState(0);

  useEffect(() => {
    setTotalPercent(
      editableGoals.reduce(
        (sum, g) => sum + (g.time_allocation_target_percent || 0),
        0
      )
    );
  }, [editableGoals]);

  // Reset goals when quarter changes
  useEffect(() => {
    setEditableGoals(
      goals
        .filter((g) => g.quarter === selectedQuarter)
        .map((g, i) => ({ ...g, priority: i + 1 }))
    );
  }, [selectedQuarter, goals]);

  const updateGoal = (index: number, field: keyof Goal, value: any) => {
    setEditableGoals((prev) =>
      prev.map((g, i) => (i === index ? { ...g, [field]: value } : g))
    );
  };

  const removeGoal = (index: number) => {
    setEditableGoals((prev) =>
      prev
        .filter((_, i) => i !== index)
        .map((g, i) => ({ ...g, priority: i + 1 }))
    );
  };

  const addGoal = () => {
    if (editableGoals.length >= 5) return;
    setEditableGoals((prev) => [
      ...prev,
      {
        goal_text: "",
        category: "Product",
        priority: prev.length + 1,
        time_allocation_target_percent: 0,
        quarter: selectedQuarter,
      },
    ]);
  };

  const handleSave = () => {
    const valid = editableGoals.filter((g) => g.goal_text.trim());
    onSave(valid.map((g) => ({ ...g, quarter: selectedQuarter })));
  };

  const canSave =
    totalPercent <= 100 &&
    editableGoals.every((g) => g.goal_text.trim()) &&
    editableGoals.length > 0;

  const quarterOptions = getQuarterOptions();

  return (
    <div className="flex flex-col gap-6 p-6 overflow-y-auto h-full">
      {/* HEADER */}
      <div>
        <h3 className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-3)] mb-3">
          Quarterly priorities
        </h3>
        <div className="flex gap-1.5 flex-wrap">
          {quarterOptions.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => setSelectedQuarter(q)}
              className={cn(
                "rounded-full px-3 py-1 font-mono text-[11px] border transition-all",
                selectedQuarter === q
                  ? "bg-[var(--violet)] border-[var(--violet)] text-white"
                  : "border-[var(--border)] text-[var(--text-2)] hover:border-[var(--border-hi)]"
              )}
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* EMPTY STATE */}
      {editableGoals.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 text-center gap-4">
          <p className="font-mono text-[12px] text-[var(--text-3)]">
            No priorities set for {selectedQuarter}
          </p>
          <button
            type="button"
            onClick={addGoal}
            className="flex items-center gap-2 button-ghost px-4 py-2 text-[12px]"
          >
            <Plus size={13} />
            Add your first priority
          </button>
        </div>
      )}

      {/* GOALS LIST */}
      {editableGoals.length > 0 && (
        <div className="space-y-4">
          {editableGoals.map((goal, i) => (
            <div
              key={i}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface-hi)] p-4 space-y-3"
            >
              {/* Row 1: priority + goal text + remove */}
              <div className="flex items-center gap-2">
                <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full bg-[var(--violet)] text-white font-mono text-[10px]">
                  {i + 1}
                </span>
                <input
                  value={goal.goal_text}
                  onChange={(e) => updateGoal(i, "goal_text", e.target.value)}
                  placeholder="Describe this priority..."
                  className="flex-1 rounded border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-[12px] text-[var(--text-1)] placeholder-[var(--text-3)] focus:border-[var(--violet)] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => removeGoal(i)}
                  className="text-[var(--text-3)] hover:text-[var(--ember)] transition-colors"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Row 2: category select */}
              <select
                value={goal.category}
                onChange={(e) => updateGoal(i, "category", e.target.value)}
                className="w-full rounded border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-[12px] text-[var(--text-1)] focus:border-[var(--violet)] focus:outline-none"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              {/* Row 3: time allocation slider */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-mono text-[10px] text-[var(--text-3)]">
                    Time target
                  </label>
                  <span className="font-mono text-[11px] text-[var(--text-1)] font-medium">
                    {goal.time_allocation_target_percent}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={goal.time_allocation_target_percent}
                  onChange={(e) =>
                    updateGoal(
                      i,
                      "time_allocation_target_percent",
                      parseInt(e.target.value)
                    )
                  }
                  className="w-full accent-[var(--violet)]"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ADD GOAL BUTTON */}
      {editableGoals.length > 0 && editableGoals.length < 5 && (
        <button
          type="button"
          onClick={addGoal}
          className="flex items-center gap-2 button-ghost px-4 py-2 text-[12px] self-start"
        >
          <Plus size={13} />
          Add priority
        </button>
      )}

      {/* TOTAL INDICATOR */}
      {editableGoals.length > 0 && (
        <div
          className={cn(
            "font-mono text-[11px] text-center py-2 rounded-lg border",
            totalPercent > 100
              ? "text-[var(--ember)] border-[rgba(255,107,53,0.2)] bg-[rgba(255,107,53,0.06)]"
              : totalPercent === 100
              ? "text-[var(--green)] border-[rgba(16,185,129,0.2)] bg-[rgba(16,185,129,0.06)]"
              : "text-[var(--text-3)] border-[var(--border)]"
          )}
        >
          Total time allocated: {totalPercent}%
          {totalPercent > 100 && (
            <div className="text-[10px] mt-0.5">
              Exceeds 100% — reduce allocations
            </div>
          )}
          {totalPercent === 100 && (
            <div className="text-[10px] mt-0.5">Perfect allocation</div>
          )}
        </div>
      )}

      {/* SAVE BUTTON */}
      {editableGoals.length > 0 && (
        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave || isLoading}
          className="rounded bg-[var(--violet)] px-5 py-2.5 text-[13px] font-mono text-white hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading && <Loader2 size={13} className="animate-spin" />}
          Save priorities
        </button>
      )}
    </div>
  );
}
