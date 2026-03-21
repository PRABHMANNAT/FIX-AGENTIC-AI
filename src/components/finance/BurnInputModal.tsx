"use client";

import { useState, useEffect } from "react";
import { X, Plus, Trash2, AlertCircle } from "lucide-react";
import type { BurnData, ExpenseCategory } from "@/types/finance";

interface BurnInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { cash_balance: number; monthly_revenue: number; monthly_expenses: ExpenseCategory[] }) => void;
  initialData?: Partial<BurnData>;
}

function fmtINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(amount);
}

export function BurnInputModal({ isOpen, onClose, onSave, initialData }: BurnInputModalProps) {
  const [cashBalance, setCashBalance] = useState<string>("");
  const [monthlyRevenue, setMonthlyRevenue] = useState<string>("");
  const [monthlyExpenses, setMonthlyExpenses] = useState<ExpenseCategory[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Initialize form when modal opens
  useEffect(() => {
    if (isOpen) {
      setCashBalance(initialData?.cash_balance !== undefined ? String(initialData.cash_balance) : "");
      setMonthlyRevenue(initialData?.monthly_revenue !== undefined ? String(initialData.monthly_revenue) : "");
      
      if (initialData?.monthly_expenses && initialData.monthly_expenses.length > 0) {
        setMonthlyExpenses(JSON.parse(JSON.stringify(initialData.monthly_expenses)));
      } else {
        setMonthlyExpenses([
          { category: "Salaries", amount: 0 },
          { category: "Infrastructure", amount: 0 },
          { category: "Marketing", amount: 0 },
          { category: "Tools", amount: 0 },
        ]);
      }
      setError(null);
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const totalExpenses = monthlyExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);

  const handleSave = () => {
    const cash = Number(cashBalance);
    const rev = Number(monthlyRevenue);

    if (isNaN(cash) || cash <= 0) {
      setError("Cash balance must be greater than 0.");
      return;
    }

    if (isNaN(rev) || rev < 0) {
      setError("Monthly revenue cannot be negative.");
      return;
    }

    onSave({
      cash_balance: cash,
      monthly_revenue: rev,
      monthly_expenses: monthlyExpenses.map(e => ({
        category: e.category.trim() || "Uncategorized",
        amount: Number(e.amount) || 0,
      })),
    });
  };

  const updateExpense = (index: number, field: keyof ExpenseCategory, value: string | number) => {
    const updated = [...monthlyExpenses];
    updated[index] = { ...updated[index], [field]: value };
    setMonthlyExpenses(updated);
  };

  const removeExpense = (index: number) => {
    setMonthlyExpenses(monthlyExpenses.filter((_, i) => i !== index));
  };

  const addExpense = () => {
    setMonthlyExpenses([...monthlyExpenses, { category: "", amount: 0 }]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm anim-fade-in">
      <div 
        className="panel w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
        style={{ boxShadow: "0 20px 40px -10px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4 bg-[var(--surface-hi)]">
          <h2 className="font-display font-medium text-[16px] text-[var(--text-1)]">Update Financials</h2>
          <button 
            type="button" 
            onClick={onClose}
            className="text-[var(--text-3)] hover:text-[var(--text-1)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          
          {/* Global Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded bg-[rgba(255,107,53,0.1)] border border-[rgba(255,107,53,0.2)] text-[var(--ember)] font-mono text-[12px]">
              <AlertCircle size={14} />
              <span>{error}</span>
            </div>
          )}

          {/* Cash Balance */}
          <div className="flex flex-col gap-2">
            <label className="system-label" htmlFor="cash-balance">Current cash balance</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-[13px] text-[var(--text-3)] pointer-events-none">₹</span>
              <input
                id="cash-balance"
                type="number"
                value={cashBalance}
                onChange={(e) => {
                  setCashBalance(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="e.g. 5000000"
                className="w-full bg-[var(--surface-hi)] border border-[var(--border)] rounded px-3 py-2 pl-7 text-[14px] font-mono text-[var(--text-1)] placeholder-[var(--text-3)] focus:outline-none focus:border-[var(--violet)] focus:ring-1 focus:ring-[var(--violet)] transition-colors"
              />
            </div>
          </div>

          {/* Monthly Revenue */}
          <div className="flex flex-col gap-2">
            <label className="system-label" htmlFor="monthly-revenue">Monthly revenue</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-[13px] text-[var(--text-3)] pointer-events-none">₹</span>
              <input
                id="monthly-revenue"
                type="number"
                value={monthlyRevenue}
                onChange={(e) => setMonthlyRevenue(e.target.value)}
                placeholder="e.g. 200000"
                className="w-full bg-[var(--surface-hi)] border border-[var(--border)] rounded px-3 py-2 pl-7 text-[14px] font-mono text-[var(--text-1)] placeholder-[var(--text-3)] focus:outline-none focus:border-[var(--violet)] focus:ring-1 focus:ring-[var(--violet)] transition-colors"
              />
            </div>
          </div>

          {/* Expenses */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label className="system-label">Monthly expenses</label>
            </div>
            
            <div className="flex flex-col gap-2">
              {monthlyExpenses.map((exp, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={exp.category}
                    onChange={(e) => updateExpense(i, "category", e.target.value)}
                    placeholder="Category name"
                    className="flex-1 bg-[var(--surface-hi)] border border-[var(--border)] rounded px-3 py-2 text-[13px] font-comfortaa text-[var(--text-1)] placeholder-[var(--text-3)] focus:outline-none focus:border-[var(--violet)] focus:ring-1 focus:ring-[var(--violet)] transition-colors"
                  />
                  <div className="relative w-1/3 min-w-[120px]">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-[12px] text-[var(--text-3)] pointer-events-none">₹</span>
                    <input
                      type="number"
                      value={exp.amount || ""}
                      onChange={(e) => updateExpense(i, "amount", Number(e.target.value))}
                      placeholder="Amount"
                      className="w-full bg-[var(--surface-hi)] border border-[var(--border)] rounded px-3 py-2 pl-7 text-[13px] font-mono text-[var(--text-1)] placeholder-[var(--text-3)] focus:outline-none focus:border-[var(--violet)] focus:ring-1 focus:ring-[var(--violet)] transition-colors"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeExpense(i)}
                    className="h-[38px] w-[38px] flex items-center justify-center rounded border border-[var(--border)] bg-[var(--surface-hi)] text-[var(--text-3)] hover:text-[var(--ember)] hover:border-[rgba(255,107,53,0.3)] transition-colors"
                    title="Remove expense"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addExpense}
              className="button-ghost mt-1 self-start flex items-center gap-1.5 text-[11px] px-3 py-1.5"
            >
              <Plus size={12} />
              Add expense category
            </button>

            {/* Running Total */}
            <div className="mt-4 p-4 rounded bg-[rgba(123,97,255,0.04)] border border-[rgba(123,97,255,0.15)] flex items-center justify-between">
              <span className="font-mono text-[11px] uppercase tracking-widest text-[var(--violet)]">Total expenses</span>
              <span className="font-mono text-[14px] font-bold text-[var(--text-1)]">₹ {fmtINR(totalExpenses)} <span className="text-[10px] text-[var(--text-3)] font-normal">/ month</span></span>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="border-t border-[var(--border)] px-6 py-4 flex items-center justify-end gap-3 bg-[var(--surface-hi)]">
          <button
            type="button"
            onClick={onClose}
            className="button-ghost px-5 py-2 text-[13px]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="button px-5 py-2 text-[13px]"
          >
            Save figures
          </button>
        </div>
      </div>
    </div>
  );
}
