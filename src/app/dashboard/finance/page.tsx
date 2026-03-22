"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { Settings, AlertTriangle, X } from "lucide-react";
import { useFinanceData } from "@/hooks/useFinanceData";
import { useFinanceAgent } from "@/hooks/useFinanceAgent";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import type { ArtifactType, FundraisingStage, FundraisingScore, CashFlowProjection, WeeklyBriefing, Invoice, ExpenseReport, RevenueData, PitchSlides } from "@/types/finance";

// Artifact components
import { FinanceHomeView } from "@/components/finance/FinanceHomeView";
import { FinanceChatPanel, type FinanceChatPanelRef } from "@/components/finance/FinanceChatPanel";
import { FinanceSettingsPanel } from "@/components/finance/FinanceSettingsPanel";
import { InvoiceArtifact } from "@/components/finance/InvoiceArtifact";
import { InvestorReportArtifact } from "@/components/finance/InvestorReportArtifact";
import { PitchDeckArtifact } from "@/components/finance/PitchDeckArtifact";
import { CashFlowArtifact } from "@/components/finance/CashFlowArtifact";
import { BriefingArtifact } from "@/components/finance/BriefingArtifact";
import { RevenueDashboard } from "@/components/finance/RevenueDashboard";
import { BurnRunwayArtifact } from "@/components/finance/BurnRunwayArtifact";
import { BurnInputModal } from "@/components/finance/BurnInputModal";
import { ExpenseArtifact } from "@/components/finance/ExpenseArtifact";
import { FundraisingArtifact } from "@/components/finance/FundraisingArtifact";
import { AnomalyFeed } from "@/components/finance/AnomalyFeed";
import { SlackInsights } from "@/components/integrations/SlackInsights";
import { TimeAudit } from "@/components/integrations/TimeAudit";
import { GoalSetter } from "@/components/integrations/GoalSetter";
import { WorkflowHub } from "@/components/intelligence/WorkflowHub";
import { GitHubVelocity } from "@/components/integrations/GitHubVelocity";
import { DecisionQueue } from "@/components/intelligence/DecisionQueue";
import { ProactiveAlertBell } from "@/components/intelligence/ProactiveAlertBell";

interface RecentDocument {
  id: string;
  type: string;
  title: string;
  created_at: string;
}

export default function FinanceSpacePage() {
  const [supabase] = useState(() => createBrowserSupabaseClient());
  const [userId, setUserId] = useState("");
  const financeData = useFinanceData();

  // Artifact state
  const [activeArtifactType, setActiveArtifactType] = useState<ArtifactType | null>(null);
  const [activeArtifactData, setActiveArtifactData] = useState<unknown>(null);
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null);
  const [invoiceChangedFields] = useState<string[]>([]);
  const [cashFlowGenerating, setCashFlowGenerating] = useState(false);
  const [fundraisingScoring, setFundraisingScoring] = useState(false);
  const [briefingGenerating, setBriefingGenerating] = useState(false);
  const [burnModalOpen, setBurnModalOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedFundraisingStage, setSelectedFundraisingStage] = useState<FundraisingStage>("seed");
  const [recentDocuments, setRecentDocuments] = useState<RecentDocument[]>([]);
  const [mobileArtifactOpen, setMobileArtifactOpen] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);

  // Slack state
  const [slackData, setSlackData] = useState<{
    insights: any[];
    unanswered_count: number;
    last_synced: string | null;
    connected: boolean;
  }>({ insights: [], unanswered_count: 0, last_synced: null, connected: false });
  const [slackSyncing, setSlackSyncing] = useState(false);

  // Calendar/time-audit state
  const [calendarData, setCalendarData] = useState<any>(null);
  const [calendarSyncing, setCalendarSyncing] = useState(false);

  // Goals state
  const [goalsData, setGoalsData] = useState<any[]>([]);
  const [goalsSaving, setGoalsSaving] = useState(false);

  function getCurrentQuarter(): string {
    const now = new Date();
    const q = Math.ceil((now.getMonth() + 1) / 3);
    return `Q${q} ${now.getFullYear()}`;
  }

  const fetchCalendarData = useCallback(async () => {
    try {
      const res = await fetch('/api/integrations/calendar/insights');
      if (!res.ok) return;
      const data = await res.json();
      setCalendarData(data);
    } catch {}
  }, []);

  const fetchGoals = useCallback(async () => {
    try {
      const res = await fetch('/api/goals');
      if (!res.ok) return;
      const data = await res.json();
      setGoalsData(data.goals || []);
    } catch {}
  }, []);

  useEffect(() => {
    fetchCalendarData();
    fetchGoals();
  }, [fetchCalendarData, fetchGoals]);

  // Hub analysis state
  const [hubAnalysis, setHubAnalysis] = useState<any>(null);
  const [hubDataSources, setHubDataSources] = useState({
    finance: true, slack: false, calendar: false, github: false,
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastAnalyzed, setLastAnalyzed] = useState<string | null>(null);


  const fetchSlackData = useCallback(async () => {
    try {
      const res = await fetch('/api/integrations/slack/insights');
      if (!res.ok) return;
      const data = await res.json();
      setSlackData({
        insights: data.insights || [],
        unanswered_count: data.unanswered_count || 0,
        last_synced: data.last_synced || null,
        connected: data.connected || false,
      });
    } catch {}
  }, []);

  useEffect(() => {
    fetchSlackData();
  }, [fetchSlackData]);

  // Chat panel ref for imperative quick actions
  const chatPanelRef = useRef<FinanceChatPanelRef>(null);

  // Auth
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, [supabase]);

  // Recent documents
  useEffect(() => {
    fetch("/api/finance/documents/recent")
      .then((r) => r.json())
      .then((data) => setRecentDocuments(data.documents || []))
      .catch(() => {});
  }, []);

  // Artifact change handler
  const handleArtifactChange = useCallback((type: ArtifactType, data: unknown, documentId?: string) => {
    setActiveArtifactType(type);
    setActiveArtifactData(data);
    setActiveDocumentId(documentId || null);
  }, []);

  // Quick action from FinanceHomeView → send to chat
  const handleQuickAction = useCallback((message: string) => {
    chatPanelRef.current?.sendMessage(message);
  }, []);

  // Hub analysis runner (placed after handleArtifactChange)
  const runHubAnalysis = useCallback(async () => {
    if (!userId) return;
    setIsAnalyzing(true);
    try {
      const res = await fetch('/api/intelligence/hub', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      setHubAnalysis(data.analysis);
      setHubDataSources(data.data_sources_used);
      setLastAnalyzed(data.generated_at);
      handleArtifactChange('workflow_hub', data.analysis, undefined);
    } catch (e) {
      console.error('Hub analysis failed:', e);
    } finally {
      setIsAnalyzing(false);
    }
  }, [userId, handleArtifactChange]);

  // Decision queue state
  const [decisions, setDecisions] = useState<any[]>([]);
  const [decisionsTotal, setDecisionsTotal] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [resolvedDecisions, setResolvedDecisions] = useState<string[]>([]);

  const scanDecisions = useCallback(async () => {
    if (!userId) return;
    setIsScanning(true);
    try {
      const res = await fetch('/api/intelligence/decisions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      setDecisions(data.decisions || []);
      setDecisionsTotal(data.total || 0);
      handleArtifactChange('decision_queue', data, undefined);
    } catch (e) {
      console.error('Decision scan failed:', e);
    } finally {
      setIsScanning(false);
    }
  }, [userId, handleArtifactChange]);

  const resolveDecision = useCallback((sourceId: string) => {
    setResolvedDecisions(prev => [...prev, sourceId]);
    setDecisions(prev => prev.filter((d: any) => d.source_id !== sourceId));
  }, []);

  const draftDecisionResponse = useCallback((decision: any) => {
    const message = `Help me draft a response to this unresolved item:
  Source: ${decision.source}
  Issue: ${decision.summary}
  Open for: ${decision.days_open} days
  Suggested approach: ${decision.draft_recommendation}`;
    chatPanelRef.current?.sendMessage(message);
    handleArtifactChange('decision_queue', { decisions, total: decisionsTotal }, undefined);
  }, [decisions, decisionsTotal, handleArtifactChange]);

  // GitHub velocity state
  const [githubData, setGithubData] = useState<any>(null);
  const [githubSyncing, setGithubSyncing] = useState(false);

  const fetchGithubData = useCallback(async () => {
    try {
      const res = await fetch('/api/integrations/github/insights');
      if (!res.ok) return;
      setGithubData(await res.json());
    } catch {}
  }, []);

  useEffect(() => {
    fetchGithubData();
  }, [fetchGithubData]);

  // Proactive alert bell state
  const [bellAlerts, setBellAlerts] = useState<any[]>([]);
  const [bellUnreadCount, setBellUnreadCount] = useState(0);

  const fetchBellAlerts = useCallback(async () => {
    try {
      const res = await fetch('/api/finance/proactive/alerts');
      const data = await res.json();
      setBellAlerts(data.alerts || []);
      setBellUnreadCount(data.unread_count || 0);
    } catch {}
  }, []);

  useEffect(() => {
    fetchBellAlerts();
    const interval = setInterval(fetchBellAlerts, 90000);
    return () => clearInterval(interval);
  }, [fetchBellAlerts]);

  // Render the right panel content based on artifact type
  const renderArtifactPanel = () => {
    switch (activeArtifactType) {
      case "invoice":
        return (
          <InvoiceArtifact
            invoice={activeArtifactData as Invoice}
            documentId={activeDocumentId || ""}
            isLoading={false}
            changedFields={invoiceChangedFields}
            onStatusChange={async (status: string) => {
              try {
                setPageError(null);
                const res = await fetch("/api/finance/invoice/update", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ userId, documentId: activeDocumentId, status }),
                });
                if (!res.ok) throw new Error(await res.text() || "Failed to update invoice");
                setActiveArtifactData((prev: unknown) => ({ ...(prev as Record<string, unknown>), status }));
              } catch (err: any) {
                setPageError(err.message || "Failed to complete action");
              }
            }}
          />
        );

      case "investor_report":
        return (
          <InvestorReportArtifact
            report={activeArtifactData as Record<string, unknown>}
            documentId={activeDocumentId || ""}
            month={(activeArtifactData as Record<string, unknown>)?.month as string}
            year={(activeArtifactData as Record<string, unknown>)?.year as number}
            onGeneratePitchDeck={async () => {
              try {
                setPageError(null);
                const res = await fetch("/api/finance/investor-report/pitch-deck", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ userId, reportData: activeArtifactData }),
                });
                if (!res.ok) throw new Error(await res.text() || "Failed to generate pitch deck");
                const result = await res.json();
                handleArtifactChange("pitch_deck", { slides: result.slides, companyName: result.companyName }, result.documentId);
              } catch (err: any) {
                setPageError(err.message || "Failed to generate pitch deck");
              }
            }}
          />
        );

      case "pitch_deck":
        return (
          <PitchDeckArtifact
            slides={(activeArtifactData as Record<string, unknown>)?.slides as unknown as PitchSlides}
            documentId={activeDocumentId || ""}
            companyName={financeData.settings?.company_name || "Your Company"}
          />
        );

      case "cash_flow":
        return (
          <CashFlowArtifact
            projection={activeArtifactData as CashFlowProjection}
            documentId={activeDocumentId || ""}
            isLoading={cashFlowGenerating}
            onRecalculate={async (assumptions: unknown) => {
              setCashFlowGenerating(true);
              setPageError(null);
              try {
                const res = await fetch("/api/finance/cashflow", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ userId, assumptions }),
                });
                if (!res.ok) throw new Error(await res.text() || "Failed to generate projection");
                const result = await res.json();
                handleArtifactChange("cash_flow", result.projection, result.documentId);
              } catch (err: any) {
                setPageError(err.message || "Failed to generate projection");
              } finally {
                setCashFlowGenerating(false);
              }
            }}
          />
        );

      case "briefing":
        return (
          <BriefingArtifact
            briefing={activeArtifactData as WeeklyBriefing}
            allBriefings={financeData.briefings}
            isLoading={false}
            isGenerating={briefingGenerating}
            onGenerate={async () => {
              setBriefingGenerating(true);
              setPageError(null);
              try {
                const res = await fetch("/api/finance/briefing/generate", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ userId }),
                });
                if (!res.ok) throw new Error(await res.text() || "Failed to generate briefing");
                const result = await res.json();
                handleArtifactChange("briefing", result.briefing, result.briefing?.id);
              } catch (err: any) {
                setPageError(err.message || "Failed to generate briefing");
              } finally {
                setBriefingGenerating(false);
              }
            }}
            onSendToSlack={async () => {
              try {
                setPageError(null);
                const res = await fetch("/api/finance/briefing/generate", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ userId, force: true }),
                });
                if (!res.ok) throw new Error(await res.text() || "Failed to send to Slack");
              } catch (err: any) {
                setPageError(err.message || "Failed to send to Slack");
              }
            }}
          />
        );

      case "revenue_dashboard":
        return (
          <RevenueDashboard
            data={financeData.stripeData as unknown as RevenueData}
            isConnected={financeData.isConnected}
            isLoading={financeData.isLoading}
            onSyncNow={financeData.syncStripe}
            onConnectStripe={financeData.connectStripe}
          />
        );

      case "burn_runway":
        return (
          <BurnRunwayArtifact
            burnData={financeData.burnData}
            isLoading={financeData.isLoading}
            onOpenInputModal={() => setBurnModalOpen(true)}
            onUpdate={async (data: unknown) => {
              try {
                setPageError(null);
                const res = await fetch("/api/finance/burn", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ userId, ...(data as Record<string, unknown>) }),
                });
                if (!res.ok) throw new Error(await res.text() || "Failed to update burn rate");
                financeData.refresh();
              } catch (err: any) {
                setPageError(err.message || "Failed to update burn rate");
              }
            }}
          />
        );

      case "expenses":
        return (
          <ExpenseArtifact
            report={activeArtifactData as ExpenseReport}
            isLoading={false}
            onUploadCSV={async (file: File) => {
              try {
                setPageError(null);
                const text = await file.text();
                const lines = text.split("\n").filter((l) => l.trim());
                if (lines.length < 2) throw new Error("File must have a header and at least one row");
                const delimiter = lines[0].includes("\t") ? "\t" : ",";
                const expenses = lines.slice(1).map((line) => {
                  const parts = line.split(delimiter).map((p) => p.trim().replace(/(^"|"$)/g, ""));
                  return { description: parts[0] || "", amount: parseFloat(parts[1]) || 0, date: parts[2] || new Date().toISOString().split("T")[0] };
                }).filter((e) => e.description && e.amount > 0);
                
                if (!expenses.length) throw new Error("No valid expenses found in file");
                
                const res = await fetch("/api/finance/expenses/categorize", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ userId, expenses }),
                });
                if (!res.ok) throw new Error(await res.text() || "Failed to categorize expenses");
                const result = await res.json();
                if (result.summary) {
                  handleArtifactChange("expenses", result.summary);
                }
              } catch (err: any) {
                setPageError(err.message || "Failed to process CSV file");
              }
            }}
            onRefresh={financeData.refresh}
          />
        );

      case "fundraising":
        return (
          <FundraisingArtifact
            score={activeArtifactData as FundraisingScore}
            documentId={activeDocumentId}
            isLoading={false}
            isScoring={fundraisingScoring}
            selectedStage={selectedFundraisingStage}
            onStageChange={setSelectedFundraisingStage}
            onRecalculate={async () => {
              setFundraisingScoring(true);
              setPageError(null);
              try {
                const res = await fetch("/api/finance/fundraising/score", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ userId, target_stage: selectedFundraisingStage }),
                });
                if (!res.ok) throw new Error(await res.text() || "Failed to score fundraising");
                const result = await res.json();
                handleArtifactChange("fundraising", result.score, result.documentId);
              } catch (err: any) {
                setPageError(err.message || "Failed to evaluate fundraising metrics");
              } finally {
                setFundraisingScoring(false);
              }
            }}
          />
        );

      case "anomalies":
        return (
          <AnomalyFeed
            anomalies={financeData.anomalies}
            isLoading={financeData.isLoading}
            onStatusChange={async (id: string, status: string) => {
              try {
                setPageError(null);
                const res = await fetch("/api/finance/anomalies/list", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ id, status, userId }),
                });
                if (!res.ok) throw new Error(await res.text() || "Failed to update anomaly status");
                financeData.refresh();
              } catch (err: any) {
                setPageError(err.message || "Failed to update status");
              }
            }}
            onRefresh={async () => {
              try {
                setPageError(null);
                const res = await fetch("/api/finance/anomalies/detect", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ userId }),
                });
                if (!res.ok) throw new Error(await res.text() || "Failed to run anomaly detection");
                financeData.refresh();
              } catch (err: any) {
                setPageError(err.message || "Anomaly detection failed");
              }
            }}
          />
        );

      case "slack_insights":
        return (
          <SlackInsights
            insights={slackData.insights}
            unansweredCount={slackData.unanswered_count}
            isConnected={slackData.connected}
            isLoading={false}
            lastSynced={slackData.last_synced}
            isSyncing={slackSyncing}
            onConnect={() => {
              if (userId)
                window.location.href = `/api/integrations/slack/connect?userId=${userId}`;
            }}
            onSync={async () => {
              setSlackSyncing(true);
              try {
                await fetch('/api/integrations/slack/sync', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ userId }),
                });
                await fetchSlackData();
              } catch {}
              setSlackSyncing(false);
            }}
          />
        );

      case "time_audit":
        return (
          <TimeAudit
            auditData={calendarData}
            isLoading={false}
            isSyncing={calendarSyncing}
            onConnect={() => {
              if (userId)
                window.location.href = `/api/integrations/calendar/connect?userId=${userId}`;
            }}
            onSync={async () => {
              setCalendarSyncing(true);
              try {
                await fetch('/api/integrations/calendar/sync', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ userId }),
                });
                await fetchCalendarData();
              } catch {}
              setCalendarSyncing(false);
            }}
            onSaveReflection={async (intended: string, actual: string) => {
              try {
                await fetch('/api/goals/reflections', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ intended, actual, userId }),
                });
                await fetchCalendarData();
              } catch {}
            }}
          />
        );

      case "goal_setter":
        return (
          <GoalSetter
            goals={goalsData}
            currentQuarter={getCurrentQuarter()}
            isLoading={goalsSaving}
            onSave={async (goals: any[]) => {
              setGoalsSaving(true);
              try {
                await fetch('/api/goals', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ goals, userId }),
                });
                await fetchGoals();
              } catch {}
              setGoalsSaving(false);
            }}
          />
        );

      case "workflow_hub":
        return (
          <WorkflowHub
            analysis={hubAnalysis}
            dataSourcesUsed={hubDataSources}
            isLoading={false}
            isAnalyzing={isAnalyzing}
            lastAnalyzed={lastAnalyzed}
            onRunAnalysis={runHubAnalysis}
          />
        );

      case "github_velocity":
        return (
          <GitHubVelocity
            metrics={githubData?.metrics || null}
            insights={githubData?.insights || []}
            velocityScore={githubData?.velocity_score}
            isConnected={!!githubData?.connected}
            isLoading={false}
            lastSynced={githubData?.last_synced || null}
            isSyncing={githubSyncing}
            onConnect={() => {
              if (userId)
                window.location.href = `/api/integrations/github/connect?userId=${userId}`;
            }}
            onSync={async () => {
              setGithubSyncing(true);
              try {
                await fetch('/api/integrations/github/sync', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ userId }),
                });
                await fetchGithubData();
              } catch {}
              setGithubSyncing(false);
            }}
          />
        );

      case "decision_queue":
        return (
          <DecisionQueue
            decisions={decisions.filter((d: any) => !resolvedDecisions.includes(d.source_id))}
            total={decisionsTotal}
            isLoading={false}
            isScanning={isScanning}
            onScan={scanDecisions}
            onResolve={resolveDecision}
            onDraftRecommendation={draftDecisionResponse}
          />
        );

      default:
        return (
          <FinanceHomeView
            onQuickAction={handleQuickAction}
            recentDocuments={recentDocuments}
            anomalies={financeData.anomalies}
            stripeData={financeData.stripeData}
            isConnected={financeData.isConnected}
          />
        );
    }
  };

  return (
    <div style={{ display: "flex", height: "100vh", background: "#000", overflow: "hidden" }}>
      {/* ── Middle Panel: Chat ── */}
      <div
        style={{
          flex: "0 0 420px",
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          margin: "16px 0 16px 16px",
          borderRadius: 16,
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.06)",
          background: "var(--background)",
          position: "relative",
        }}
      >
        {pageError && (
          <div className="mx-4 mt-4 flex items-center justify-between rounded-lg bg-[rgba(239,68,68,0.1)] px-4 py-3 text-[13px] text-[var(--ember)] border border-[rgba(239,68,68,0.2)]">
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} />
              <span>{pageError}</span>
            </div>
            <button onClick={() => setPageError(null)} className="hover:opacity-70"><X size={14} /></button>
          </div>
        )}
        <FinanceChatPanel
          ref={chatPanelRef}
          userId={userId}
          onArtifactChange={handleArtifactChange}
          onTriggerHubAnalysis={runHubAnalysis}
        />
      </div>

      {/* ── Right Panel: Artifact ── */}
      <div
        className="hidden md:flex"
        style={{
          flex: 1,
          flexDirection: "column",
          minWidth: 0,
          margin: "16px 16px 16px 0",
          borderRadius: 16,
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.06)",
          background: "var(--surface)",
          position: "relative",
        }}
      >
        {/* Settings gear + Alert bell */}
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
          <ProactiveAlertBell
            alerts={bellAlerts}
            unreadCount={bellUnreadCount}
            onDismiss={async (id) => {
              await fetch('/api/finance/proactive/alerts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, status: 'dismissed', userId }),
              });
              fetchBellAlerts();
            }}
            onMarkAllRead={async () => {
              for (const alert of bellAlerts) {
                await fetch('/api/finance/proactive/alerts', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ id: alert.id, status: 'read', userId }),
                });
              }
              fetchBellAlerts();
            }}
            onInvestigate={(alert) => {
              chatPanelRef.current?.sendMessage(
                `Tell me more about this alert: ${alert.message}`
              );
            }}
          />
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="flex h-8 w-8 items-center justify-center rounded text-[var(--text-3)] hover:text-[var(--text-1)] transition-colors"
            title="Finance Settings"
          >
            <Settings size={16} />
          </button>
        </div>
        {renderArtifactPanel()}
      </div>

      {/* ── Mobile: Floating View Doc button ── */}
      {activeArtifactType && (
        <button
          type="button"
          onClick={() => setMobileArtifactOpen(true)}
          className="md:hidden fixed bottom-4 right-4 z-30 rounded bg-[var(--violet)] px-4 py-2.5 text-[13px] font-mono text-white shadow-lg hover:brightness-110 transition-all"
        >
          View Document
        </button>
      )}

      {/* ── Mobile: Full-screen overlay ── */}
      {mobileArtifactOpen && (
        <div className="md:hidden fixed inset-0 z-50 overflow-y-auto bg-[var(--background)]">
          <button
            type="button"
            onClick={() => setMobileArtifactOpen(false)}
            className="fixed top-4 left-4 z-50 text-[var(--text-1)] p-2"
          >
            ✕
          </button>
          <div className="pt-12">{renderArtifactPanel()}</div>
        </div>
      )}

      {/* ── Modals ── */}
      <BurnInputModal
        isOpen={burnModalOpen}
        onClose={() => setBurnModalOpen(false)}
        onSave={async (data: Record<string, unknown>) => {
          try {
            setPageError(null);
            const res = await fetch("/api/finance/burn", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ userId, ...data }),
            });
            if (!res.ok) throw new Error(await res.text() || "Failed to save burn data");
            setBurnModalOpen(false);
            financeData.refresh();
          } catch (err: any) {
            setPageError(err.message || "Failed to save burn metrics");
            setBurnModalOpen(false); // Close modal, show error structurally
          }
        }}
        initialData={financeData.burnData ?? undefined}
      />

      <FinanceSettingsPanel
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onSave={async (settings: Record<string, unknown>) => {
          await financeData.updateSettings(settings);
          setSettingsOpen(false);
        }}
        initialSettings={financeData.settings}
        userId={userId}
      />
    </div>
  );
}

