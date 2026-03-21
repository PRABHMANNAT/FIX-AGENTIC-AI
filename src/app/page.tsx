"use client";

import { Mail, ShieldCheck, User2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createBrowserSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import { cn } from "@/lib/utils";

type AuthMode = "login" | "signup";

const modules = [
  { key: "F1", label: "AI Assistant", detail: "Helps you decide what to do next", tone: "text-accent" },
  { key: "F2", label: "Sales Check", detail: "Shows why sales may be slowing down", tone: "text-[var(--cyan)]" },
  { key: "F3", label: "Revenue View", detail: "Tracks money coming in and going out", tone: "text-[var(--amber)]" },
  { key: "F4", label: "Find Customers", detail: "Finds people to contact for you", tone: "text-[var(--pink)]" },
];

export default function HomePage() {
  const router = useRouter();
  const [supabase] = useState(() => createBrowserSupabaseClient());
  const [mode, setMode] = useState<AuthMode>("login");
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const setOnboardedCookie = (value: "0" | "1") => {
    document.cookie = `ao_onboarded=${value}; Path=/; Max-Age=2592000; SameSite=Lax`;
  };

  const routeAfterSignIn = async () => {
    if (!supabase) {
      router.push("/dashboard");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarded,bmo_config")
      .eq("id", user.id)
      .maybeSingle();

    const onboarded = Boolean(profile?.onboarded);
    setOnboardedCookie(onboarded ? "1" : "0");

    if (profile?.bmo_config) {
      window.localStorage.setItem("assembleone_bmo_config", JSON.stringify(profile.bmo_config));
    }

    router.push(onboarded ? "/dashboard" : "/onboard");
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      if (!isSupabaseConfigured || !supabase) {
        router.push("/dashboard");
        return;
      }

      if (mode === "login") {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: form.email,
          password: form.password,
        });

        if (signInError) {
          setError(signInError.message);
          return;
        }

        await routeAfterSignIn();
        return;
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            full_name: form.fullName,
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      if (data.session) {
        setOnboardedCookie("0");
        router.push("/onboard");
        return;
      }

      setSuccess("Account created. Check your email, then sign in.");
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative overflow-hidden border-b border-border px-6 py-10 lg:border-b-0 lg:border-r lg:px-10 lg:py-12">
          <div className="absolute left-6 top-6 h-12 w-12">
            <span className="absolute left-0 top-0 h-px w-12 bg-gradient-to-r from-accent/80 to-transparent" />
            <span className="absolute left-0 top-0 h-12 w-px bg-gradient-to-b from-accent/80 to-transparent" />
          </div>

          <div className="grid-surface panel panel-tint-green relative flex h-full flex-col justify-between overflow-hidden p-8 lg:p-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(66,200,255,0.08),transparent_28%),radial-gradient(circle_at_top_left,rgba(0,255,136,0.06),transparent_32%)]" />
            <div className="relative">
              <div className="system-label text-[9px] text-accent">Assemble / v0.1 / System Boot</div>
              <div className="mt-10 space-y-2 font-display text-[72px] uppercase leading-[0.9] tracking-[0.03em] lg:text-[88px]">
                <div className="text-white">Your</div>
                <div className="hero-outline">Company</div>
                <div className="text-accent">Runs</div>
                <div className="text-white">Itself.</div>
              </div>
              <p className="comfort-copy mt-8 max-w-sm text-sm leading-relaxed text-[#737373]">
                AssembleOne helps any business owner describe what they do in one sentence, then
                sets up customer finding, email outreach, and simple business tracking for them.
              </p>
            </div>

            <div className="relative mt-10 space-y-4 border-t border-border pt-6">
              {modules.map((module) => (
                <div
                  key={module.key}
                  className="flex items-start justify-between gap-4 border-b border-border-subtle pb-4 last:border-b-0 last:pb-0"
                >
                  <div>
                    <div className={cn("font-mono text-[10px] uppercase tracking-[0.28em]", module.tone)}>
                      {module.key}
                    </div>
                    <div className="mt-1 font-display text-2xl uppercase tracking-[0.05em] text-white">
                      {module.label}
                    </div>
                  </div>
                  <div className="comfort-copy max-w-[220px] text-right text-xs leading-relaxed text-text-secondary">
                    {module.detail}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center px-6 py-10 lg:px-10">
          <div className="panel panel-tint-cyan grid-surface w-full max-w-md p-6 lg:p-8">
            <div className="mb-6 flex items-center justify-between gap-3">
              <div>
                <div className="font-display text-4xl uppercase leading-none tracking-[0.05em] text-white">
                  {mode === "login" ? "Sign In" : "Create Account"}
                </div>
                <div className="comfort-copy mt-2 text-sm text-text-secondary">
                  {isSupabaseConfigured
                    ? "Sign in and we will set up your office in under a minute."
                    : "Demo mode is active until Supabase keys are configured."}
                </div>
              </div>
              <ShieldCheck className="h-5 w-5 text-[var(--cyan)]" strokeWidth={2} />
            </div>

            <div className="mb-6 flex rounded-md border border-border bg-[#070707] p-1">
              {(["login", "signup"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setMode(tab)}
                  className={cn(
                    "flex-1 rounded-[4px] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.24em]",
                    mode === tab
                      ? "bg-accent text-black"
                      : "text-text-secondary hover:text-white",
                  )}
                >
                  {tab === "login" ? "Login" : "Create Account"}
                </button>
              ))}
            </div>

            {!isSupabaseConfigured ? (
              <div className="mb-4 rounded-md border border-[rgba(0,255,136,0.2)] bg-[rgba(0,255,136,0.08)] p-3">
                <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-accent">
                  Demo Access / Configure `.env.local` for live auth
                </div>
              </div>
            ) : null}

            {error ? (
              <div className="mb-4 rounded-md border border-red-800/30 bg-red-900/20 p-3">
                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-red-300">
                  {error}
                </div>
              </div>
            ) : null}

            {success ? (
              <div className="mb-4 rounded-md border border-[rgba(0,255,136,0.2)] bg-[rgba(0,255,136,0.08)] p-3">
                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-accent">
                  {success}
                </div>
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "signup" ? (
                <label className="block space-y-2">
                  <span className="system-label text-text-muted">Full Name</span>
                  <div className="relative">
                    <User2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-micro" />
                    <input
                      required
                      value={form.fullName}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, fullName: event.target.value }))
                      }
                      className="input-shell w-full pl-10"
                      placeholder="Operator Zero"
                    />
                  </div>
                </label>
              ) : null}

              <label className="block space-y-2">
                <span className="system-label text-text-muted">Email</span>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-micro" />
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                    className="input-shell w-full pl-10"
                    placeholder="founder@company.com"
                  />
                </div>
              </label>

              <label className="block space-y-2">
                <span className="system-label text-text-muted">Password</span>
                <input
                  required
                  type="password"
                  value={form.password}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, password: event.target.value }))
                  }
                  className="input-shell w-full"
                  placeholder="Minimum 8 characters"
                />
              </label>

              <button type="submit" disabled={isPending} className="button-primary w-full">
                {isPending
                  ? "Authorizing"
                  : !isSupabaseConfigured
                    ? "Enter Demo Command Center"
                    : mode === "login"
                      ? "Enter Command Center"
                      : "Create Account"}
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
