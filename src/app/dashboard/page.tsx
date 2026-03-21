"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ArtifactPanel from "@/components/dashboard/ArtifactPanel";
import ChatColumn, { type DashboardThreadMessage } from "@/components/dashboard/ChatColumn";
import IconSidebar from "@/components/dashboard/IconSidebar";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import type {
  AgentMessage,
  BMOProfile,
  DashboardArtifactView,
  DashboardChatActionButton,
  DashboardChatResponse,
  DashboardSnapshot,
  FinanceAnalysis,
  Lead,
  WarRoomResponse,
} from "@/types";

const FALLBACK_TERMINAL_LINES = [
  "Syncing business context...",
  "Planning next action...",
  "Routing output to artifact board...",
];

function inferTerminalLines(input: string) {
  if (/find|customer|lead|search/i.test(input)) {
    return [
      "Authorizing search access...",
      "Calibrating ICP parameters...",
      "Initiating LinkedIn scrape...",
      "Scoring matches with AI...",
    ];
  }

  if (/war.?room|mission|parallel|deploy/i.test(input)) {
    return [
      "Authorizing parallel system permissions...",
      "Cloning primary agent into 4 threads...",
      "Deploying search, email, pricing nodes...",
      "Locking global state into War Room...",
    ];
  }

  if (/email|outreach|sequence|draft/i.test(input)) {
    return [
      "Pulling lead context...",
      "Analyzing buying signals...",
      "Drafting personalized outreach...",
    ];
  }

  if (/revenue|money|finance|runway|burn/i.test(input)) {
    return [
      "Parsing financial inputs...",
      "Running burn rate calculations...",
      "Generating runway projections...",
    ];
  }

  return ["Processing your request..."];
}

function readCachedBmoConfig(): BMOProfile | null {
  if (typeof window === "undefined") {
    return null;
  }

  const cached = window.localStorage.getItem("assembleone_bmo_config");

  if (!cached) {
    return null;
  }

  try {
    return JSON.parse(cached) as BMOProfile;
  } catch {
    return null;
  }
}

function createThreadMessage(
  role: DashboardThreadMessage["role"],
  content: string,
  id?: string,
): DashboardThreadMessage {
  return {
    id:
      id ??
      (typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
    role,
    content,
    created_at: new Date().toISOString(),
  };
}

function buildBootstrapMessage(bmoContext: BMOProfile | null) {
  if (!bmoContext) {
    return "Central AI online. Say find customers, analyze revenue, draft emails, or launch a war room.";
  }

  return `Central AI online for ${bmoContext.business_name}. I'm tracking ${bmoContext.primary_goal.toLowerCase()} in ${bmoContext.geography}. Say find customers, analyze revenue, draft emails, or launch a war room.`;
}

function normalizeArtifactView(value: string | null | undefined): DashboardArtifactView | null {
  switch (value) {
    case "home":
    case "agent":
    case "leads":
    case "sequences":
    case "revenue":
    case "warroom":
    case "integrations":
      return value;
    default:
      return null;
  }
}

function isLeadRecord(value: unknown): value is Lead {
  return Boolean(
    value &&
      typeof value === "object" &&
      "id" in value &&
      "name" in value &&
      typeof (value as Lead).id === "string" &&
      typeof (value as Lead).name === "string",
  );
}

function upsertLead(leads: Lead[], candidate: Lead) {
  const existing = leads.find((lead) => lead.id === candidate.id);

  if (!existing) {
    return [candidate, ...leads];
  }

  return leads.map((lead) => (lead.id === candidate.id ? { ...lead, ...candidate } : lead));
}

function wait(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export default function DashboardPage() {
  const [supabase] = useState(() => createBrowserSupabaseClient());
  const [activePanel, setActivePanel] = useState<DashboardArtifactView>("home");
  const [artifactView, setArtifactView] = useState<DashboardArtifactView>("home");
  const [messages, setMessages] = useState<DashboardThreadMessage[]>(() => [
    createThreadMessage(
      "assistant",
      buildBootstrapMessage(readCachedBmoConfig()),
      "dashboard-bootstrap",
    ),
  ]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [terminalLines, setTerminalLines] = useState<string[]>([]);
  const [actionButton, setActionButton] = useState<DashboardChatActionButton | null>(null);
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [bmoContext, setBmoContext] = useState<BMOProfile | null>(() => readCachedBmoConfig());
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState("Founder");
  const [userInitial, setUserInitial] = useState("A");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [revenueAnalysis, setRevenueAnalysis] = useState<FinanceAnalysis | null>(null);
  const [warRoom, setWarRoom] = useState<WarRoomResponse | null>(null);
  const [loadingSnapshot, setLoadingSnapshot] = useState(true);

  const syncLeads = useCallback((nextLeads: Lead[]) => {
    setLeads(nextLeads);
    setSelectedLead((current) => {
      if (!nextLeads.length) {
        return null;
      }

      if (!current) {
        return nextLeads[0] ?? null;
      }

      return nextLeads.find((lead) => lead.id === current.id) ?? nextLeads[0] ?? null;
    });
    setSnapshot((current) =>
      current
        ? {
            ...current,
            leads: nextLeads,
            metrics: {
              ...current.metrics,
              customers_found: nextLeads.length,
            },
          }
        : current,
    );
  }, []);

  const applyExecutedData = useCallback(
    (
      executedData: Record<string, unknown> | null | undefined,
      nextView: DashboardArtifactView | null,
    ) => {
      if (!executedData) {
        return;
      }

      if (Array.isArray(executedData.leads)) {
        const nextLeads = executedData.leads.filter(isLeadRecord);
        syncLeads(nextLeads);

        if ((nextView === "leads" || nextView === "sequences") && nextLeads.length) {
          setSelectedLead(nextLeads[0] ?? null);
        }
      }

      if (executedData.analysis && typeof executedData.analysis === "object") {
        setRevenueAnalysis(executedData.analysis as FinanceAnalysis);
      }

      if (isLeadRecord(executedData.lead)) {
        const nextLead = executedData.lead;
        setSelectedLead(nextLead);
        setLeads((current) => upsertLead(current, nextLead));
      }
    },
    [syncLeads],
  );

  const loadSnapshot = useCallback(async () => {
    setLoadingSnapshot(true);

    try {
      if (supabase) {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          setUserId(user.id);
          setUserName(user.user_metadata?.full_name ?? "Founder");
          setUserInitial(
            (user.user_metadata?.full_name ?? user.email ?? "A").charAt(0).toUpperCase(),
          );

          const { data: profileRow } = await supabase
            .from("profiles")
            .select("full_name,bmo_config")
            .eq("id", user.id)
            .maybeSingle();

          if (profileRow?.full_name) {
            setUserName(profileRow.full_name);
            setUserInitial(profileRow.full_name.charAt(0).toUpperCase());
          }

          if (profileRow?.bmo_config) {
            setBmoContext(profileRow.bmo_config as BMOProfile);
          }
        }
      }

      const response = await fetch("/api/dashboard/snapshot", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Dashboard link unstable. Reload in a second.");
      }

      const nextSnapshot = (await response.json()) as DashboardSnapshot;
      setSnapshot(nextSnapshot);
      setUserId(nextSnapshot.user_id);
      setBmoContext(nextSnapshot.bmo_context ?? null);
      setUserInitial((current) => {
        const source = nextSnapshot.bmo_context?.business_name ?? current;
        return source.charAt(0).toUpperCase() || "A";
      });

      if (nextSnapshot.bmo_context) {
        window.localStorage.setItem(
          "assembleone_bmo_config",
          JSON.stringify(nextSnapshot.bmo_context),
        );
      }

      syncLeads(nextSnapshot.leads ?? []);
    } catch (error) {
      const fallbackMessage =
        error instanceof Error
          ? error.message
          : "Dashboard link unstable. Reload in a second.";

      setMessages((current) => {
        if (current.some((message) => message.content === fallbackMessage)) {
          return current;
        }

        return [...current, createThreadMessage("assistant", fallbackMessage)];
      });
    } finally {
      setLoadingSnapshot(false);
    }
  }, [supabase, syncLeads]);

  useEffect(() => {
    void loadSnapshot();
  }, [loadSnapshot]);

  useEffect(() => {
    setMessages((current) => {
      if (!current.length || current[0]?.id !== "dashboard-bootstrap") {
        return current;
      }

      return [
        {
          ...current[0],
          content: buildBootstrapMessage(bmoContext),
        },
        ...current.slice(1),
      ];
    });
  }, [bmoContext]);

  const switchPanel = useCallback((panel: DashboardArtifactView) => {
    setActivePanel(panel);
    setArtifactView(panel);
  }, []);

  const routeAction = useCallback(
    (action: string, payload?: unknown) => {
      const normalized = action.toLowerCase();

      if (
        normalized.includes("sequence") ||
        normalized.includes("email") ||
        normalized.includes("draft")
      ) {
        if (isLeadRecord(payload)) {
          setSelectedLead(payload);
        }

        switchPanel("sequences");
        return;
      }

      if (
        normalized.includes("lead") ||
        normalized.includes("customer") ||
        normalized.includes("search")
      ) {
        switchPanel("leads");
        return;
      }

      if (
        normalized.includes("revenue") ||
        normalized.includes("finance") ||
        normalized.includes("runway")
      ) {
        switchPanel("revenue");
        return;
      }

      if (normalized.includes("war")) {
        switchPanel("warroom");
        return;
      }

      if (
        normalized.includes("integration") ||
        normalized.includes("setting") ||
        normalized.includes("config")
      ) {
        switchPanel("integrations");
        return;
      }

      if (
        normalized.includes("refresh") ||
        normalized.includes("overview") ||
        normalized.includes("home")
      ) {
        switchPanel("home");
        void loadSnapshot();
      }
    },
    [loadSnapshot, switchPanel],
  );

  const handleSend = useCallback(async () => {
    const content = input.trim();

    if (!content || isThinking) {
      return;
    }

    const userMessage = createThreadMessage("user", content);
    const nextMessages = [...messages, userMessage];
    const apiMessages: AgentMessage[] = nextMessages.map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      created_at: message.created_at,
    }));

    setMessages(nextMessages);
    setInput("");
    setIsThinking(true);
    setActionButton(null);
    setTerminalLines(inferTerminalLines(content));

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: apiMessages,
          user_id: userId,
          bmo_context: bmoContext,
        }),
      });

      const result = (await response.json()) as DashboardChatResponse & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(
          result.error ?? "Central AI hit a wall. Try that again in a second.",
        );
      }

      const nextView = normalizeArtifactView(result.artifact_switch);
      const lines = result.terminal_lines?.length
        ? result.terminal_lines
        : FALLBACK_TERMINAL_LINES;

      setTerminalLines(lines);
      await wait(Math.min(1800, lines.length * 280 + 240));

      if (nextView) {
        switchPanel(nextView);
      }

      applyExecutedData(result.executed_data ?? null, nextView);
      setMessages((current) => [
        ...current,
        createThreadMessage("assistant", result.message),
      ]);
      setActionButton(result.action_button ?? null);

      if (result.data_refresh) {
        void loadSnapshot();
      }
    } catch (error) {
      setMessages((current) => [
        ...current,
        createThreadMessage(
          "assistant",
          error instanceof Error
            ? error.message
            : "Central AI hit a wall. Try that again in a second.",
        ),
      ]);
    } finally {
      setIsThinking(false);
      setTerminalLines([]);
    }
  }, [
    applyExecutedData,
    bmoContext,
    input,
    isThinking,
    loadSnapshot,
    messages,
    switchPanel,
    userId,
  ]);

  const artifactData = useMemo(
    () => ({
      snapshot,
      userId,
      bmoContext,
      leads,
      selectedLead,
      revenueAnalysis,
      warRoom,
    }),
    [bmoContext, leads, revenueAnalysis, selectedLead, snapshot, userId, warRoom],
  );

  if (!userId && loadingSnapshot) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          background: "#000",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "rgba(255,255,255,0.2)",
            letterSpacing: "0.2em",
          }}
        >
          LOADING...
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", height: "100vh", background: "#000", overflow: "hidden" }}>
      <IconSidebar
        activePanel={activePanel}
        onSwitch={(panel) => {
          setActionButton(null);
          switchPanel(panel);
        }}
        userName={userName}
        userInitial={userInitial}
      />

      <div
        style={{
          flex: 1,
          display: "flex",
          overflow: "hidden",
          margin: "16px 16px 16px 0",
          gap: 0,
          minWidth: 0,
        }}
      >
        <ChatColumn
          messages={messages}
          input={input}
          onInputChange={setInput}
          onSend={() => void handleSend()}
          isThinking={isThinking}
          terminalLines={terminalLines}
          actionButton={actionButton}
          onAction={(button) => routeAction(button.action)}
          bmoContext={bmoContext}
        />

        <ArtifactPanel
          view={artifactView}
          data={artifactData}
          onAction={routeAction}
          onLeadsChange={syncLeads}
          onRevenueAnalysis={setRevenueAnalysis}
          onLeadMutate={(leadId, updates) => {
            setLeads((current) =>
              current.map((lead) =>
                lead.id === leadId ? { ...lead, ...updates } : lead,
              ),
            );
            setSelectedLead((current) =>
              current?.id === leadId ? { ...current, ...updates } : current,
            );
          }}
          onWarRoomResult={(result) => {
            setWarRoom(result);

            if (result.leads) {
              syncLeads(result.leads);
            }

            if (result.finance) {
              setRevenueAnalysis(result.finance);
            }
          }}
        />

        {loadingSnapshot ? (
          <div className="pointer-events-none absolute bottom-5 left-[112px] rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--text-3)]">
            syncing dashboard state
          </div>
        ) : null}
      </div>
    </div>
  );
}
