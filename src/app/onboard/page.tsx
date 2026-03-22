"use client";

import { ArrowRight } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, Suspense } from "react";
import { createBrowserSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import { cn, formatTime } from "@/lib/utils";
import type {
  AgentMessage,
  BMOAgentId,
  BMOProfile,
  BMOProfileUpdate,
  OnboardChatResponse,
  OnboardMode,
} from "@/types";

const TOTAL_STEPS = 6;

type OnboardThreadMessage = AgentMessage & {
  options?: string[] | null;
  selectedOption?: string | null;
  responseLocked?: boolean;
};

const AGENT_LABELS: Record<BMOAgentId, string> = {
  find_customers: "Find Customers",
  email_outreach: "Email Outreach",
  finance: "My Revenue",
  social_media: "Social Media",
};

function createMessage(
  role: AgentMessage["role"],
  content: string,
  options: string[] | null = null,
): OnboardThreadMessage {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    created_at: new Date().toISOString(),
    options,
    selectedOption: null,
    responseLocked: role === "user",
  };
}

function mergeProfile(current: Partial<BMOProfile>, update: BMOProfileUpdate): Partial<BMOProfile> {
  const next = { ...current };

  if (update.business_name !== null) next.business_name = update.business_name;
  if (update.industry !== null) next.industry = update.industry;
  if (update.what_they_do !== null) next.what_they_do = update.what_they_do;
  if (update.who_they_serve !== null) next.who_they_serve = update.who_they_serve;
  if (update.primary_goal !== null) next.primary_goal = update.primary_goal;
  if (update.geography !== null) next.geography = update.geography;
  if (update.market_type !== null) next.market_type = update.market_type;
  if (update.agents_needed !== null) next.agents_needed = update.agents_needed;
  if (update.linkedin_search_query !== null) next.linkedin_search_query = update.linkedin_search_query;
  if (update.github_search_query !== null) next.github_search_query = update.github_search_query;
  if (update.suggested_email_hook !== null) next.suggested_email_hook = update.suggested_email_hook;
  if (update.icp_description !== null) next.icp_description = update.icp_description;

  return next;
}

function profileToSynthesisLines(profile: BMOProfile) {
  return [
    `${profile.business_name} · ${profile.industry} · ${profile.geography}`,
    `Customer finder: ${profile.who_they_serve}`,
    `AI team: ${profile.agents_needed.map((agent) => AGENT_LABELS[agent]).join(" · ")}`,
    `Goal: ${profile.primary_goal}`,
  ];
}

function firstAssistantMessage(mode: OnboardMode) {
  if (mode === "enhance") {
    return "Your office is already running. What would you like to sharpen first: who you want to reach, your goal, or how people find you now?";
  }

  return "Let's build your office. What do you do, and who are you trying to reach?";
}

function firstAssistantOptions(mode: OnboardMode) {
  if (mode === "enhance") {
    return ["Who I want to reach", "My main goal", "How I get customers", "What is not working"];
  }

  return ["I run a gym", "I'm building an app", "I freelance", "I run a local business"];
}

function OnboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode: OnboardMode = searchParams.get("mode") === "enhance" ? "enhance" : "build";
  const [supabase] = useState(() => createBrowserSupabaseClient());
  const [userId, setUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<OnboardThreadMessage[]>([]);
  const [profile, setProfile] = useState<Partial<BMOProfile>>({});
  const [seedProfile, setSeedProfile] = useState<Partial<BMOProfile> | null>(null);
  const [readyToBuild, setReadyToBuild] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [building, setBuilding] = useState(false);
  const [showSynthesis, setShowSynthesis] = useState(false);
  const [finalProfile, setFinalProfile] = useState<BMOProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [booting, setBooting] = useState(true);
  const [showComplete, setShowComplete] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!textareaRef.current) {
      return;
    }

    textareaRef.current.style.height = "0px";
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
  }, [input]);

  useEffect(() => {
    threadRef.current?.scrollTo({
      top: threadRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [loading, messages]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!isSupabaseConfigured || !supabase) {
        router.replace("/dashboard");
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!active) {
        return;
      }

      if (!user) {
        router.replace("/");
        return;
      }

      const { data: profileRow } = await supabase
        .from("profiles")
        .select("onboarded,bmo_config")
        .eq("id", user.id)
        .maybeSingle();

      if (!active) {
        return;
      }

      const existingProfile = (profileRow?.bmo_config as BMOProfile | null | undefined) ?? null;
      const onboarded = Boolean(profileRow?.onboarded);

      if (mode === "build" && onboarded) {
        document.cookie = "ao_onboarded=1; Path=/; Max-Age=2592000; SameSite=Lax";

        if (existingProfile) {
          window.localStorage.setItem("assembleone_bmo_config", JSON.stringify(existingProfile));
        }

        router.replace("/dashboard");
        return;
      }

      setUserId(user.id);
      setSeedProfile(existingProfile);
      setProfile(existingProfile ?? {});
      setMessages([createMessage("assistant", firstAssistantMessage(mode), firstAssistantOptions(mode))]);
      setReadyToBuild(false);
      setBooting(false);
    };

    void load();

    return () => {
      active = false;
    };
  }, [mode, router, supabase]);

  useEffect(() => {
    if (!showSynthesis || !finalProfile) {
      setShowComplete(false);
      return;
    }

    const lines = profileToSynthesisLines(finalProfile);
    const completeDelay = lines.length * 400 + 600;
    const completeTimer = window.setTimeout(() => setShowComplete(true), completeDelay);
    const redirectTimer = window.setTimeout(() => router.push("/dashboard"), completeDelay + 1000);

    return () => {
      window.clearTimeout(completeTimer);
      window.clearTimeout(redirectTimer);
    };
  }, [finalProfile, router, showSynthesis]);

  const userTurns = useMemo(
    () => messages.filter((message) => message.role === "user").length,
    [messages],
  );

  const latestAssistantMessageId = useMemo(() => {
    return [...messages].reverse().find((message) => message.role === "assistant")?.id ?? null;
  }, [messages]);

  const latestAssistantHasOptions = useMemo(() => {
    const latestAssistant = [...messages].reverse().find((message) => message.role === "assistant");
    return Boolean(latestAssistant?.options?.length && latestAssistant.responseLocked !== true);
  }, [messages]);

  const progress = readyToBuild ? TOTAL_STEPS : Math.min(Math.max(userTurns + 1, 1), TOTAL_STEPS);
  const canBuild = readyToBuild && userTurns >= 4 && !loading && !building;

  const previewData = useMemo(() => {
    const currentAgents = profile.agents_needed ?? seedProfile?.agents_needed ?? [];

    const cards = [
      {
        key: "business",
        label: "Your Business",
        value:
          [
            profile.business_name ?? seedProfile?.business_name,
            profile.geography ?? seedProfile?.geography,
          ]
            .filter(Boolean)
            .join(" · ") || "",
      },
      {
        key: "customers",
        label: "Your Customers",
        value: profile.who_they_serve ?? seedProfile?.who_they_serve ?? "",
      },
      {
        key: "goal",
        label: "Your Goal",
        value: profile.primary_goal ?? seedProfile?.primary_goal ?? "",
      },
      {
        key: "market",
        label: "Your Market",
        value:
          [
            profile.market_type ?? seedProfile?.market_type,
            profile.geography ?? seedProfile?.geography,
          ]
            .filter(Boolean)
            .map((part) =>
              typeof part === "string" ? part.charAt(0).toUpperCase() + part.slice(1) : String(part),
            )
            .join(" · ") || "",
      },
      {
        key: "team",
        label: "AI Team",
        value: currentAgents.map((agent) => AGENT_LABELS[agent]).join(" · "),
        pills: currentAgents,
      },
      {
        key: "hook",
        label: "First Outreach",
        value: profile.suggested_email_hook ?? seedProfile?.suggested_email_hook ?? "",
      },
      {
        key: "search",
        label: "Customer Search",
        value: profile.linkedin_search_query ?? seedProfile?.linkedin_search_query ?? "",
      },
    ];

    return mode === "enhance"
      ? cards
      : cards.filter(
          (card) =>
            (typeof card.value === "string" && card.value.trim().length > 0) ||
            (Array.isArray(card.pills) && card.pills.length > 0),
        );
  }, [mode, profile, seedProfile]);

  const sendMessage = async (text?: string, selectedOption?: string | null) => {
    const content = text ?? input.trim();

    if (!content || loading || !userId) {
      return;
    }

    const userMessage = createMessage("user", content);
    const lockedMessages = messages.map((message) =>
      message.id === latestAssistantMessageId
        ? {
            ...message,
            responseLocked: true,
            selectedOption: selectedOption ?? null,
          }
        : message,
    );
    const nextMessages = [...lockedMessages, userMessage];

    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/onboard/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: nextMessages.map((message) => ({
            role: message.role,
            content: message.content,
          })),
          current_profile: profile,
          user_id: userId,
          mode,
        }),
      });

      const payload = (await response.json()) as (OnboardChatResponse & {
        options?: string[] | null;
        error?: string;
      });

      if (!response.ok) {
        throw new Error(payload.error || "Our AI is taking a moment. Try again in a few seconds.");
      }

      setMessages((current) => [
        ...current,
        createMessage("assistant", payload.message, payload.options ?? null),
      ]);
      setProfile((current) => mergeProfile(current, payload.profile_update));

      if (payload.ready_to_build) {
        setReadyToBuild(true);
      }
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Our AI is taking a moment. Try again in a few seconds.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOptionClick = async (option: string) => {
    if (loading || building) {
      return;
    }

    setMessages((current) =>
      current.map((message) =>
        message.id === latestAssistantMessageId
          ? {
              ...message,
              selectedOption: option,
            }
          : message,
      ),
    );

    await new Promise((resolve) => window.setTimeout(resolve, 150));
    await sendMessage(option, option);
  };

  const buildOffice = async () => {
    if (!userId) {
      setError("You'll need to sign in again.");
      return;
    }

    setBuilding(true);
    setShowSynthesis(true);
    setShowComplete(false);
    setFinalProfile(null);
    setError(null);

    try {
      const response = await fetch("/api/onboard/build", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          profile,
          conversation: messages.map((message) => ({
            role: message.role,
            content: message.content,
          })),
          user_id: userId,
          mode,
        }),
      });

      const payload = (await response.json()) as {
        error?: string;
        profile?: BMOProfile;
        success?: boolean;
      };

      if (!response.ok || !payload.profile) {
        throw new Error(payload.error || "Something went wrong building your office. Try again.");
      }

      window.localStorage.setItem("assembleone_bmo_config", JSON.stringify(payload.profile));
      document.cookie = "ao_onboarded=1; Path=/; Max-Age=2592000; SameSite=Lax";
      setFinalProfile(payload.profile);
      setProfile(payload.profile);
      setReadyToBuild(true);
    } catch (nextError) {
      setShowSynthesis(false);
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Something went wrong building your office. Try again.",
      );
    } finally {
      setBuilding(false);
    }
  };

  if (showSynthesis) {
    const lines = finalProfile ? profileToSynthesisLines(finalProfile) : [];

    return (
      <div className="synthesis-screen">
        <div className="synth-label">ASSEMBLING YOUR OFFICE</div>

        {!finalProfile ? (
          <div className="flex flex-col items-center gap-5">
            <div className="flex items-center gap-2">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </div>
            <div className="font-mono text-[12px] uppercase tracking-[0.2em] text-[var(--text-2)]">
              Pulling everything into place...
            </div>
          </div>
        ) : (
          <>
            {lines.map((line, index) => (
              <div
                key={line}
                className="synth-line"
                style={{ animationDelay: `${index * 0.4}s` }}
              >
                <span className="synth-check">✓</span>
                <span>{line}</span>
              </div>
            ))}
            {showComplete ? <div className="synth-complete">YOUR OFFICE IS READY.</div> : null}
          </>
        )}
      </div>
    );
  }

  return (
    <div className="onboard-shell">
      <section className="onboard-thread-pane">
        <header className="onboard-header">
          <div>
            <div className="onboard-logo">ASSEMBLE</div>
            <div className="onboard-subhead">
              {mode === "enhance" ? "ENHANCE YOUR OFFICE" : "BUILD YOUR OFFICE"}
            </div>
          </div>
          <div className="text-right">
            <div className="font-mono text-[9px] uppercase tracking-[0.24em] text-[var(--text-3)]">
              {progress} / {TOTAL_STEPS}
            </div>
            <div className="progress-dots">
              {Array.from({ length: TOTAL_STEPS }).map((_, index) => (
                <span
                  key={index}
                  className={cn("progress-dot", index < progress && "is-active")}
                />
              ))}
            </div>
          </div>
        </header>

        <div ref={threadRef} className="min-h-0 flex-1 overflow-y-auto px-8 pb-6">
          <div className="mx-auto max-w-3xl">
            {booting ? (
              <div className="anim-fade-in font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--text-2)]">
                Getting your office ready...
              </div>
            ) : null}

            {messages.map((message, index) => (
              <div
                key={message.id}
                className={cn(
                  "message-row",
                  message.role === "assistant" ? "justify-start" : "justify-end",
                )}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                {message.role === "assistant" ? (
                  <>
                    <div className="ai-avatar">A</div>
                    <div className="max-w-[720px]">
                      <p className="ai-message-text">{message.content}</p>

                      {message.options?.length ? (
                        <div className="options-grid">
                          {message.options.map((option, optionIndex) => (
                            <button
                              key={`${message.id}-${option}`}
                              type="button"
                              className={cn(
                                "option-pill",
                                message.selectedOption === option && "selected",
                              )}
                              style={{ animationDelay: `${0.05 + optionIndex * 0.05}s` }}
                              onClick={() => void handleOptionClick(option)}
                              disabled={
                                message.id !== latestAssistantMessageId ||
                                message.responseLocked === true ||
                                loading ||
                                building
                              }
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </>
                ) : (
                  <div className="user-message-block">
                    <div className="user-message-text">{message.content}</div>
                    <div className="message-time">{formatTime(message.created_at)}</div>
                  </div>
                )}
              </div>
            ))}

            {loading ? (
              <div className="message-row justify-start">
                <div className="ai-avatar">A</div>
                <div className="typing-row">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </div>
              </div>
            ) : null}

            {error ? (
              <div className="anim-fade-in mt-4 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--ember)]">
                {error}
              </div>
            ) : null}
          </div>
        </div>

        <div className="onboard-inputbar">
          <div className="mx-auto flex w-full max-w-3xl items-end gap-3">
            <textarea
              ref={textareaRef}
              value={input}
              rows={1}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setInput("");
                  return;
                }

                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void sendMessage();
                }
              }}
              placeholder={
                latestAssistantHasOptions
                  ? "Pick an option above, or type your own..."
                  : "Type your answer..."
              }
              className="input-underline max-h-[120px] min-h-[40px] flex-1 resize-none bg-transparent outline-none"
            />
            <button
              type="button"
              onClick={() => void sendMessage()}
              disabled={loading || building || !input.trim()}
              className={cn("send-button", readyToBuild && "ready")}
            >
              <ArrowRight className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
        </div>
      </section>

      <aside className="profile-pane">
        <div className="page-kicker">Your Office</div>

        <div className="mt-6 flex-1">
          {previewData.length ? (
            previewData.map((card, index) => {
              const seededValue =
                card.key === "business"
                  ? [seedProfile?.business_name, seedProfile?.geography].filter(Boolean).join(" · ")
                  : card.key === "customers"
                    ? seedProfile?.who_they_serve
                    : card.key === "goal"
                      ? seedProfile?.primary_goal
                      : card.key === "market"
                        ? [seedProfile?.market_type, seedProfile?.geography]
                            .filter(Boolean)
                            .map((part) =>
                              typeof part === "string"
                                ? part.charAt(0).toUpperCase() + part.slice(1)
                                : String(part),
                            )
                            .join(" · ")
                        : card.key === "hook"
                          ? seedProfile?.suggested_email_hook
                          : card.key === "search"
                            ? seedProfile?.linkedin_search_query
                            : "";

              const inherited = mode === "enhance" && seededValue && seededValue === card.value;

              return (
                <div
                  key={card.key}
                  className="preview-card"
                  style={{ animationDelay: `${index * 0.06}s` }}
                >
                  <div className="preview-label">{card.label}</div>
                  {card.pills?.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {card.pills.map((agent) => (
                        <span
                          key={agent}
                          className={cn(
                            "tiny-pill",
                            profile.agents_needed?.includes(agent) && "selected",
                          )}
                        >
                          {AGENT_LABELS[agent]}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div
                      className="preview-value"
                      style={{
                        color: inherited ? "var(--text-2)" : card.value ? "var(--text-1)" : "var(--text-3)",
                      }}
                    >
                      {card.value || "Waiting for more detail..."}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="preview-card">
              <div className="preview-value">
                Your office will start filling in as we learn about your business.
              </div>
            </div>
          )}
        </div>

        {canBuild ? (
          <div className="build-cta anim-scale-in">
            <button type="button" onClick={() => void buildOffice()} className="build-cta-button">
              {mode === "enhance" ? "UPDATE MY OFFICE →" : "BUILD MY OFFICE →"}
            </button>
          </div>
        ) : (
          <div className="build-cta">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--text-3)]">
              Keep going. The build button appears once I have enough detail to set this up well.
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}

export default function OnboardPage() {
  return (
    <Suspense fallback={<div className="onboard-shell flex items-center justify-center font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--text-2)]">Loading dashboard...</div>}>
      <OnboardContent />
    </Suspense>
  );
}
