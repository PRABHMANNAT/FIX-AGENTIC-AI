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
        {/* Settings gear */}
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          className="absolute top-4 right-4 z-10 text-[var(--text-3)] hover:text-[var(--text-1)] transition-colors"
          title="Finance Settings"
        >
          <Settings size={16} />
        </button>
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
      />
    </div>
  );
}

