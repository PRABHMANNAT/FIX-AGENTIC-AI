"use client";

interface StepTwoProps {
  question: string;
  options: string[] | null;
  answer: string;
  onAnswerChange: (value: string) => void;
  onSubmit: () => void;
  loading: boolean;
  error: string | null;
}

export function StepTwo({
  question,
  options,
  answer,
  onAnswerChange,
  onSubmit,
  loading,
  error,
}: StepTwoProps) {
  return (
    <div className="w-full max-w-4xl">
      <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-accent">
        Step 2 Of 2 / One Quick Thing
      </div>
      <div className="mt-6 font-display text-[48px] uppercase leading-[0.95] text-white md:text-[56px]">
        {question}
      </div>

      {options?.length ? (
        <div className="mt-8 flex flex-wrap gap-3">
          {options.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onAnswerChange(option)}
              className={`rounded-md border px-4 py-3 font-mono text-[10px] uppercase tracking-[0.2em] transition-all duration-150 ${
                answer === option
                  ? "border-[rgba(0,255,136,0.28)] bg-[rgba(0,255,136,0.1)] text-accent"
                  : "border-border bg-[#090909] text-text-secondary hover:border-[#333] hover:text-white"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      ) : null}

      <input
        value={answer}
        onChange={(event) => onAnswerChange(event.target.value)}
        className="input-shell mt-6 w-full px-5 py-4 text-base"
        placeholder="Type your answer here"
      />

      {error ? (
        <div className="mt-4 font-mono text-[11px] uppercase tracking-[0.18em] text-danger">{error}</div>
      ) : null}

      <button
        type="button"
        onClick={onSubmit}
        disabled={loading || answer.trim().length < 1}
        className="button-primary mt-6 min-w-[240px] justify-center disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loading ? "Building..." : "Build My Office ->"}
      </button>
    </div>
  );
}

export default StepTwo;
