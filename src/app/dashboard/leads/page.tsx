"use client";

import { ArrowRight, Loader2, Mail, Target, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getStatusLabel } from "@/components/ui/StatusPill";
import { demoICPProfile, demoLeadSearchResult, demoLeads } from "@/lib/demo-data";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import { cn, formatTime } from "@/lib/utils";
import type { BMOProfile, Lead, LeadStatus, LeadSearchResult } from "@/types";

type SortMode = "match" | "ready" | "date";
type SearchSource = "linkedin" | "github";

const sourceLabels: Record<string, string> = {
  linkedin: "LinkedIn",
  github: "GitHub",
  manual: "Manual",
};

const statusOrder: Array<LeadStatus | "all"> = [
  "all",
  "new",
  "contacted",
  "replied",
  "qualified",
  "lost",
];

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function parseDraft(value: string | null) {
  if (!value) {
    return { subject: "", body: "" };
  }

  const [subject, ...rest] = value.split("\n\n");
  return {
    subject: subject.replace(/^Subject:\s*/i, "").trim(),
    body: rest.join("\n\n").trim(),
  };
}

export default function LeadsPage() {
  const [supabase] = useState(() => createBrowserSupabaseClient());
  const [customers, setCustomers] = useState<Lead[]>(demoLeads);
  const [loading, setLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [sourceFilter, setSourceFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [scoreFilter, setScoreFilter] = useState("70");
  const [sortBy, setSortBy] = useState<SortMode>("ready");
  const [searchMeta, setSearchMeta] = useState<LeadSearchResult>(demoLeadSearchResult);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [progressMessage, setProgressMessage] = useState<string | null>(null);
  const [activeIcpId, setActiveIcpId] = useState<string | null>(null);
  const [githubQuery, setGithubQuery] = useState<string | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [searchSources, setSearchSources] = useState<SearchSource[]>(["linkedin"]);
  const [progressIndex, setProgressIndex] = useState(0);
  const [draftSubject, setDraftSubject] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [noteDraft, setNoteDraft] = useState("");
  const [draftLoading, setDraftLoading] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [bmoConfig, setBmoConfig] = useState<BMOProfile | null>(null);
  const [form, setForm] = useState({
    idealCustomer: demoICPProfile.description,
    linkedinQuery: demoICPProfile.linkedin_query ?? "",
    emailHook: demoICPProfile.suggested_email_hook ?? "",
    geography: demoICPProfile.geography ?? "",
    leadCount: "25",
  });

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);

      if (!supabase) {
        setLoading(false);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || !active) {
        setLoading(false);
        return;
      }

      setCurrentUserId(user.id);

      const [customersResult, icpResult, profileResult] = await Promise.all([
        supabase.from("leads").select("*").order("created_at", { ascending: false }),
        supabase
          .from("icp_profiles")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase.from("profiles").select("bmo_config").eq("id", user.id).maybeSingle(),
      ]);

      if (!active) {
        return;
      }

      const nextBmoConfig = (profileResult.data?.bmo_config as BMOProfile | null | undefined) ?? null;
      const nextProfile = icpResult.data ?? demoICPProfile;

      setCustomers(customersResult.data?.length ? customersResult.data : demoLeads);
      setActiveIcpId(nextProfile.id ?? null);
      setGithubQuery(nextProfile.github_query ?? nextBmoConfig?.github_search_query ?? null);
      setBmoConfig(nextBmoConfig);
      setForm({
        idealCustomer: nextBmoConfig?.icp_description ?? nextProfile.description,
        linkedinQuery: nextBmoConfig?.linkedin_search_query ?? nextProfile.linkedin_query ?? "",
        emailHook: nextBmoConfig?.suggested_email_hook ?? nextProfile.suggested_email_hook ?? "",
        geography: nextBmoConfig?.geography ?? nextProfile.geography ?? "",
        leadCount: "25",
      });
      setSearchMeta((current) => ({
        ...current,
        icp_profile: nextBmoConfig?.icp_description ?? nextProfile.description,
      }));
      setSearchSources(nextProfile.github_query || nextBmoConfig?.github_search_query ? ["linkedin", "github"] : ["linkedin"]);
      setLoading(false);
    };

    void load();

    return () => {
      active = false;
    };
  }, [supabase]);

  useEffect(() => {
    if (!isSearching) {
      setProgressMessage(null);
      setProgressIndex(0);
      return;
    }

    const stages = searchSources.includes("github")
      ? ["SEARCHING LINKEDIN...", "SEARCHING GITHUB...", "SCORING MATCHES..."]
      : ["SEARCHING LINKEDIN...", "SCORING MATCHES..."];

    setProgressMessage(stages[0] ?? "SEARCHING...");

    const interval = window.setInterval(() => {
      setProgressIndex((current) => {
        const next = (current + 1) % stages.length;
        setProgressMessage(stages[next]);
        return next;
      });
    }, 1800);

    return () => window.clearInterval(interval);
  }, [isSearching, searchSources]);

  const filteredCustomers = useMemo(() => {
    return customers
      .filter((customer) => (sourceFilter === "all" ? true : customer.source === sourceFilter))
      .filter((customer) => (statusFilter === "all" ? true : customer.status === statusFilter))
      .filter((customer) => customer.icp_score >= Number(scoreFilter))
      .sort((left, right) => {
        if (sortBy === "match") {
          return right.icp_score - left.icp_score;
        }

        if (sortBy === "ready") {
          return right.intent_score - left.intent_score;
        }

        return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
      });
  }, [customers, scoreFilter, sortBy, sourceFilter, statusFilter]);

  const selectedCustomer = useMemo(
    () => customers.find((customer) => customer.id === selectedCustomerId) ?? null,
    [customers, selectedCustomerId],
  );

  useEffect(() => {
    if (!selectedCustomer) {
      setDraftSubject("");
      setDraftBody("");
      setEmailAddress("");
      setNoteDraft("");
      setDetailError(null);
      return;
    }

    const parsedDraft = parseDraft(selectedCustomer.email_draft);
    setDraftSubject(parsedDraft.subject);
    setDraftBody(parsedDraft.body);
    setEmailAddress(selectedCustomer.email ?? "");
    setNoteDraft(selectedCustomer.notes ?? "");
    setDetailError(null);
  }, [selectedCustomer]);

  const findCustomers = async () => {
    setIsSearching(true);
    setSearchError(null);

    try {
      const activeSources = searchSources.includes("github") && githubQuery ? ["linkedin", "github"] : ["linkedin"];
      const response = await fetch("/api/leads/scrape", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          icp_id: activeIcpId ?? undefined,
          icp_description: form.idealCustomer,
          search_query: form.linkedinQuery.trim() || undefined,
          count: Number(form.leadCount),
          sources: activeSources,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            error?: string;
            leads?: Lead[];
            leads_found?: number;
            sources_completed?: string[];
          }
        | null;

      if (!response.ok) {
        throw new Error(
          payload?.error ||
            "We couldn't find anyone matching that description. Try being a bit more specific about who you're looking for.",
        );
      }

      const nextCustomers = payload?.leads ?? [];

      if (!nextCustomers.length) {
        setSearchError(
          "We couldn't find anyone matching that description. Try being a bit more specific about who you're looking for.",
        );
      }

      setCustomers(nextCustomers.length ? nextCustomers : customers);
      setSearchMeta({
        leads: nextCustomers.map((customer) => ({
          name: customer.name,
          company: customer.company ?? "Unknown",
          role: customer.role ?? "Unknown",
          source: customer.source,
          icp_score: customer.icp_score,
          intent_score: customer.intent_score,
          signals: customer.signals,
          reason: customer.score_reason ?? "Looks like a good fit.",
        })),
        total_found: payload?.leads_found ?? nextCustomers.length,
        sources_searched: payload?.sources_completed ?? activeSources,
        icp_profile: form.idealCustomer,
      });

      if (nextCustomers[0]?.id) {
        setSelectedCustomerId(nextCustomers[0].id);
      }
    } catch (error) {
      setSearchError(
        error instanceof Error
          ? error.message
          : "We couldn't find anyone matching that description. Try again.",
      );
    } finally {
      setIsSearching(false);
      setProgressMessage(null);
    }
  };

  const updateCustomerStatus = async (leadId: string, status: LeadStatus) => {
    setCustomers((current) =>
      current.map((customer) =>
        customer.id === leadId
          ? { ...customer, status, updated_at: new Date().toISOString() }
          : customer,
      ),
    );

    if (supabase) {
      await supabase.from("leads").update({ status }).eq("id", leadId);
    }
  };

  const saveDraft = async () => {
    if (!selectedCustomer || !currentUserId) {
      return;
    }

    setSavingNotes(true);

    try {
      await fetch("/api/leads", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: selectedCustomer.id,
          user_id: currentUserId,
          email_draft: `Subject: ${draftSubject}\n\n${draftBody}`.trim(),
          notes: noteDraft,
        }),
      });

      setCustomers((current) =>
        current.map((customer) =>
          customer.id === selectedCustomer.id
            ? {
                ...customer,
                email_draft: `Subject: ${draftSubject}\n\n${draftBody}`.trim(),
                notes: noteDraft,
              }
            : customer,
        ),
      );
    } finally {
      setSavingNotes(false);
    }
  };

  const generateEmailDraft = async () => {
    if (!selectedCustomer || !currentUserId) {
      return;
    }

    setDraftLoading(true);
    setDetailError(null);

    try {
      const response = await fetch("/api/email/draft", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lead_id: selectedCustomer.id,
          user_id: currentUserId,
          sender_name: bmoConfig?.business_name ?? "AssembleOne",
          sender_company: bmoConfig?.business_name ?? "AssembleOne",
          value_prop: form.emailHook || "We help local businesses find and reach the right customers faster.",
        }),
      });

      const payload = (await response.json()) as {
        error?: string;
        subject?: string;
        body?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || "Our AI is taking a moment. Try again in a few seconds.");
      }

      setDraftSubject(payload.subject ?? "");
      setDraftBody(payload.body ?? "");
    } catch (error) {
      setDetailError(
        error instanceof Error
          ? error.message
          : "Our AI is taking a moment. Try again in a few seconds.",
      );
    } finally {
      setDraftLoading(false);
    }
  };

  const sendEmail = async () => {
    if (!selectedCustomer || !currentUserId || !emailAddress.trim()) {
      setDetailError("No email found for this person — try reaching out on LinkedIn instead.");
      return;
    }

    setSendLoading(true);
    setDetailError(null);

    try {
      const response = await fetch("/api/email/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lead_id: selectedCustomer.id,
          user_id: currentUserId,
          to_email: emailAddress.trim(),
          subject: draftSubject.trim(),
          email_body: draftBody.trim(),
          sender_name: bmoConfig?.business_name ?? "AssembleOne",
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "We couldn't send that email. Try again.");
      }

      await updateCustomerStatus(selectedCustomer.id, "contacted");
    } catch (error) {
      setDetailError(error instanceof Error ? error.message : "We couldn't send that email. Try again.");
    } finally {
      setSendLoading(false);
    }
  };

  return (
    <div className="page-shell">
      <div className="page-topbar anim-fade-up">
        <div>
          <div className="page-kicker">Target Search</div>
          <h1 className="page-title">Find Customers</h1>
        </div>
        <div className="font-comfortaa text-[13px] text-[var(--text-2)]">
          We&apos;ve pre-filled this from what you told us. Change anything, then run a search.
        </div>
      </div>

      <div className="search-layout">
        <aside className="search-panel card anim-fade-up delay-1">
          <div className="page-kicker">Target Search</div>
          <div className="mt-3 font-[var(--font-bebas)] text-[28px] uppercase tracking-[0.08em] text-[var(--text-1)]">
            Find Customers
          </div>

          <div className="field-stack mt-6">
            <label className="field-label">Who are you looking for?</label>
            <textarea
              rows={4}
              value={form.idealCustomer}
              onChange={(event) =>
                setForm((current) => ({ ...current, idealCustomer: event.target.value }))
              }
              className="input-shell resize-none"
            />
          </div>

          <div className="field-stack">
            <label className="field-label">Where?</label>
            <input
              value={form.geography}
              onChange={(event) =>
                setForm((current) => ({ ...current, geography: event.target.value }))
              }
              className="input-shell"
            />
          </div>

          <div className="field-stack">
            <label className="field-label">Search query</label>
            <input
              value={form.linkedinQuery}
              onChange={(event) =>
                setForm((current) => ({ ...current, linkedinQuery: event.target.value }))
              }
              className="input-shell"
            />
          </div>

          <div className="field-stack">
            <label className="field-label">How many?</label>
            <div className="segmented-control">
              {["10", "25", "50"].map((count) => (
                <button
                  key={count}
                  type="button"
                  className={cn("segmented-button", form.leadCount === count && "is-active")}
                  onClick={() => setForm((current) => ({ ...current, leadCount: count }))}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>

          <div className="field-stack">
            <label className="field-label">Search on</label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={cn("checkbox-pill", searchSources.includes("linkedin") && "is-active")}
                onClick={() => setSearchSources((current) => current.includes("linkedin") ? current : [...current, "linkedin"])}
              >
                LinkedIn
              </button>
              <button
                type="button"
                className={cn(
                  "checkbox-pill",
                  searchSources.includes("github") && "is-active",
                  !githubQuery && "opacity-40",
                )}
                onClick={() => {
                  if (!githubQuery) {
                    return;
                  }

                  setSearchSources((current) =>
                    current.includes("github")
                      ? current.filter((source) => source !== "github")
                      : [...current, "github"],
                  );
                }}
              >
                GitHub
              </button>
            </div>
          </div>

          {isSearching ? (
            <div className="search-status">
              <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--green)]">
                {progressMessage ?? "SEARCHING..."}
              </div>
              <div className="mt-2 font-comfortaa text-[13px] text-[var(--text-2)]">
                Found {searchMeta.total_found || customers.length} people so far
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => void findCustomers()}
              disabled={!form.idealCustomer.trim()}
              className="build-cta-button mt-6"
            >
              <Target className="h-4 w-4" strokeWidth={2} />
              FIND CUSTOMERS →
            </button>
          )}

          {searchError ? (
            <div className="mt-4 font-comfortaa text-[13px] leading-[1.7] text-[var(--ember)]">
              {searchError}
            </div>
          ) : null}
        </aside>

        <section className="relative min-w-0">
          <div className="customer-topbar card anim-fade-up delay-2">
            <div>
              <div className="font-[var(--font-bebas)] text-[14px] uppercase tracking-[0.18em] text-[var(--text-1)]">
                {filteredCustomers.length} Customers Found
              </div>
              <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--text-3)]">
                {searchMeta.sources_searched
                  .map((source) => sourceLabels[source]?.toUpperCase() ?? source.toUpperCase())
                  .join(" · ")}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="filter-pills">
                {statusOrder.map((status) => (
                  <button
                    key={status}
                    type="button"
                    className={cn("filter-pill", statusFilter === status && "is-active")}
                    onClick={() => setStatusFilter(status)}
                  >
                    {status === "all" ? "All" : getStatusLabel(status)}
                  </button>
                ))}
              </div>

              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as SortMode)}
                className="input-shell !w-[150px]"
              >
                <option value="match">Best match</option>
                <option value="ready">Ready to buy</option>
                <option value="date">Newest</option>
              </select>

              <select
                value={sourceFilter}
                onChange={(event) => setSourceFilter(event.target.value)}
                className="input-shell !w-[140px]"
              >
                <option value="all">All sources</option>
                <option value="linkedin">LinkedIn</option>
                <option value="github">GitHub</option>
                <option value="manual">Manual</option>
              </select>

              <select
                value={scoreFilter}
                onChange={(event) => setScoreFilter(event.target.value)}
                className="input-shell !w-[140px]"
              >
                <option value="70">Match 70%+</option>
                <option value="80">Match 80%+</option>
                <option value="90">Match 90%+</option>
              </select>
            </div>
          </div>

          {!loading && filteredCustomers.length === 0 ? (
            <div className="card mt-6 flex min-h-[420px] flex-col items-center justify-center px-10 text-center anim-fade-up delay-3">
              <div className="font-comfortaa text-[15px] leading-[1.8] text-[var(--text-3)]">
                Run your first search to find customers.
              </div>
              <div className="mt-2 max-w-[460px] font-comfortaa text-[14px] leading-[1.8] text-[var(--text-2)]">
                We&apos;ll score each person, explain why they&apos;re a fit, and give you a short personal email to send.
              </div>
            </div>
          ) : (
            <div className="customer-grid mt-6">
              {(loading ? demoLeads : filteredCustomers).map((customer, index) => {
                const signals = customer.signals.slice(0, 3);
                const hiddenSignals = customer.signals.length - signals.length;

                return (
                  <article
                    key={customer.id}
                    className="customer-card card"
                    style={{ animationDelay: `${index * 0.06}s` }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <button
                        type="button"
                        onClick={() => setSelectedCustomerId(customer.id)}
                        className="flex min-w-0 items-start gap-3 text-left"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-hi)] font-[var(--font-bebas)] text-[16px] uppercase tracking-[0.06em] text-[var(--text-2)]">
                          {initials(customer.name)}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate font-comfortaa text-[13px] font-semibold text-[var(--text-1)]">
                            {customer.name}
                          </div>
                          <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--text-2)]">
                            {[customer.role, customer.company].filter(Boolean).join(" · ")}
                          </div>
                        </div>
                      </button>
                      <span
                        className="source-pill"
                        style={{
                          color: customer.source === "linkedin" ? "var(--violet)" : "var(--text-2)",
                          borderColor:
                            customer.source === "linkedin"
                              ? "rgba(123,97,255,0.3)"
                              : "var(--border)",
                        }}
                      >
                        {sourceLabels[customer.source]}
                      </span>
                    </div>

                    <div className="mt-4 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--text-2)]">
                      {[customer.company, customer.location].filter(Boolean).join(" · ")}
                    </div>

                    <div className="mt-4 space-y-3">
                      <div>
                        <div className="mb-1 flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--text-3)]">
                          <span>Match</span>
                          <span
                            style={{
                              color:
                                customer.icp_score >= 80
                                  ? "var(--green)"
                                  : customer.icp_score >= 60
                                    ? "var(--text-1)"
                                    : "var(--text-2)",
                            }}
                          >
                            {customer.icp_score}%
                          </span>
                        </div>
                        <div className="score-track">
                          <div
                            className="score-fill"
                            style={{
                              width: `${customer.icp_score}%`,
                              background: "var(--green)",
                            }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="mb-1 flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--text-3)]">
                          <span>Ready To Buy</span>
                          <span>{customer.intent_score}%</span>
                        </div>
                        <div className="score-track">
                          <div
                            className="score-fill"
                            style={{
                              width: `${customer.intent_score}%`,
                              background: "var(--violet)",
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {signals.map((signal) => (
                        <span key={signal} className="tiny-pill">
                          {signal}
                        </span>
                      ))}
                      {hiddenSignals > 0 ? <span className="tiny-pill">+{hiddenSignals} more</span> : null}
                    </div>

                    <div className="mt-5 flex items-center justify-between gap-3">
                      <select
                        value={customer.status}
                        onChange={(event) =>
                          void updateCustomerStatus(customer.id, event.target.value as LeadStatus)
                        }
                        className="input-shell !w-[150px] !py-2 !text-[11px]"
                      >
                        <option value="new">New</option>
                        <option value="contacted">Reached out</option>
                        <option value="replied">Replied</option>
                        <option value="qualified">Interested</option>
                        <option value="lost">Not a fit</option>
                      </select>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedCustomerId(customer.id)}
                          disabled={!customer.email}
                          title={
                            customer.email
                              ? "Write an email"
                              : "No email found for this person — try reaching out on LinkedIn instead."
                          }
                          className="option-pill !px-3 !py-2 disabled:opacity-30"
                        >
                          Write Email
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedCustomerId(customer.id)}
                          className="option-pill !px-3 !py-2"
                        >
                          → Details
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {selectedCustomer ? (
            <div className="details-overlay">
              <div className="details-panel card">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="page-kicker">Customer Detail</div>
                    <div className="mt-2 font-[var(--font-bebas)] text-[32px] uppercase tracking-[0.06em] text-[var(--text-1)]">
                      {selectedCustomer.name}
                    </div>
                    <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--text-2)]">
                      {[selectedCustomer.role, selectedCustomer.company, selectedCustomer.location]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedCustomerId(null)}
                    className="option-pill !px-2.5 !py-2"
                  >
                    <X className="h-4 w-4" strokeWidth={2} />
                  </button>
                </div>

                <div className="mt-6">
                  <div className="detail-section-title">Why they are a fit</div>
                  <p className="mt-3 font-comfortaa text-[13px] leading-[1.8] text-[var(--text-2)]">
                    {selectedCustomer.score_reason ?? "Looks like a strong fit for your search."}
                  </p>
                  <div className="mt-4 space-y-3">
                    <div>
                      <div className="mb-1 flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--text-3)]">
                        <span>Match</span>
                        <span>{selectedCustomer.icp_score}%</span>
                      </div>
                      <div className="score-track">
                        <div
                          className="score-fill"
                          style={{ width: `${selectedCustomer.icp_score}%`, background: "var(--green)" }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="mb-1 flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--text-3)]">
                        <span>Ready To Buy</span>
                        <span>{selectedCustomer.intent_score}%</span>
                      </div>
                      <div className="score-track">
                        <div
                          className="score-fill"
                          style={{ width: `${selectedCustomer.intent_score}%`, background: "var(--violet)" }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {selectedCustomer.signals.map((signal) => (
                      <span key={signal} className="tiny-pill">
                        {signal}
                      </span>
                    ))}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    {selectedCustomer.linkedin_url ? (
                      <a className="detail-link" href={selectedCustomer.linkedin_url} target="_blank" rel="noreferrer">
                        LinkedIn →
                      </a>
                    ) : null}
                    {selectedCustomer.github_url ? (
                      <a className="detail-link" href={selectedCustomer.github_url} target="_blank" rel="noreferrer">
                        GitHub →
                      </a>
                    ) : null}
                  </div>
                </div>

                <div className="mt-8">
                  <div className="detail-section-title">Write an email</div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void generateEmailDraft()}
                      disabled={draftLoading || !selectedCustomer.email}
                      title={
                        selectedCustomer.email
                          ? "Generate email"
                          : "No email found for this person — try reaching out on LinkedIn instead."
                      }
                      className="build-cta-button !h-[44px] !w-auto px-5 disabled:opacity-40"
                    >
                      {draftLoading ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} /> : null}
                      GENERATE EMAIL →
                    </button>
                    <button
                      type="button"
                      onClick={() => void saveDraft()}
                      disabled={savingNotes}
                      className="option-pill !px-4 !py-3"
                    >
                      Save Draft
                    </button>
                  </div>

                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="field-label">Subject</label>
                      <input
                        value={draftSubject}
                        onChange={(event) => setDraftSubject(event.target.value)}
                        className="input-shell"
                      />
                    </div>
                    <div>
                      <label className="field-label">Body</label>
                      <textarea
                        rows={7}
                        value={draftBody}
                        onChange={(event) => setDraftBody(event.target.value)}
                        className="input-shell resize-none"
                      />
                    </div>
                    <div>
                      <label className="field-label">Their email</label>
                      <input
                        value={emailAddress}
                        onChange={(event) => setEmailAddress(event.target.value)}
                        className="input-shell"
                      />
                    </div>
                    <div>
                      <label className="field-label">Notes</label>
                      <textarea
                        rows={3}
                        value={noteDraft}
                        onChange={(event) => setNoteDraft(event.target.value)}
                        className="input-shell resize-none"
                      />
                    </div>
                  </div>

                  <div className="mt-5 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void sendEmail()}
                      disabled={sendLoading || !draftBody.trim() || !draftSubject.trim()}
                      className="build-cta-button !h-[44px] !w-auto px-5 disabled:opacity-40"
                    >
                      {sendLoading ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} /> : <Mail className="h-4 w-4" strokeWidth={2} />}
                      SEND NOW →
                    </button>
                    {selectedCustomer.email_sent_at ? (
                      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--green)]">
                        Sent {formatTime(selectedCustomer.email_sent_at)}
                      </span>
                    ) : null}
                  </div>
                </div>

                {detailError ? (
                  <div className="mt-5 font-comfortaa text-[13px] leading-[1.7] text-[var(--ember)]">
                    {detailError}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
