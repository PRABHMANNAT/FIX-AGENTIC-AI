"use client";

interface StepOneProps {
  description: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  loading: boolean;
  error: string | null;
}

export function StepOne({ description, onChange, onSubmit, loading, error }: StepOneProps) {
  return (
    <div className="w-full max-w-4xl">
      <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-accent">
        Step 1 Of 2 / Tell Us About Your Business
      </div>
      <div className="mt-6 font-display text-[56px] uppercase leading-[0.92] text-white md:text-[64px]">
        What Do You
        <br />
        Do?
      </div>
      <p className="comfort-copy mt-4 max-w-xl text-base leading-relaxed text-text-secondary">
        No jargon needed. Just describe what you do and who you help.
      </p>

      <textarea
        value={description}
        onChange={(event) => onChange(event.target.value)}
        className="input-shell mt-8 h-36 w-full resize-none px-5 py-4 text-base"
        placeholder={`I run a gym in Broadway Sydney and want more members\nI'm building a tutoring app for uni students\nI do bookkeeping for small businesses in Melbourne\nI sell handmade jewellery online and want more customers`}
      />

      {error ? (
        <div className="mt-4 font-mono text-[11px] uppercase tracking-[0.18em] text-danger">{error}</div>
      ) : null}

      <button
        type="button"
        onClick={onSubmit}
        disabled={loading || description.trim().length < 10}
        className="button-primary mt-6 min-w-[180px] justify-center disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loading ? "Thinking..." : "Next ->"}
      </button>
    </div>
  );
}

export default StepOne;
