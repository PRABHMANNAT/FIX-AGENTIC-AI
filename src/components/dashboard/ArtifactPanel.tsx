"use client";

import type {
  BMOProfile,
  DashboardArtifactView,
  DashboardSnapshot,
  FinanceAnalysis,
  Lead,
  WarRoomResponse,
} from "@/types";
import HomeArtifact from "@/components/dashboard/artifacts/HomeArtifact";
import IntegrationsArtifact from "@/components/dashboard/artifacts/IntegrationsArtifact";
import LeadsArtifact from "@/components/dashboard/artifacts/LeadsArtifact";
import RevenueArtifact from "@/components/dashboard/artifacts/RevenueArtifact";
import SequencesArtifact from "@/components/dashboard/artifacts/SequencesArtifact";
import WarRoomArtifact from "@/components/dashboard/artifacts/WarRoomArtifact";

export function ArtifactPanel({
  view,
  data,
  onAction,
  onLeadsChange,
  onRevenueAnalysis,
  onLeadMutate,
  onWarRoomResult,
}: {
  view: DashboardArtifactView;
  data: {
    snapshot: DashboardSnapshot | null;
    userId: string | null;
    bmoContext: BMOProfile | null;
    leads: Lead[];
    selectedLead: Lead | null;
    revenueAnalysis: FinanceAnalysis | null;
    warRoom: WarRoomResponse | null;
  };
  onAction: (action: string, payload?: unknown) => void;
  onLeadsChange: (leads: Lead[]) => void;
  onRevenueAnalysis: (analysis: FinanceAnalysis) => void;
  onLeadMutate: (leadId: string, updates: Partial<Lead>) => void;
  onWarRoomResult: (result: WarRoomResponse) => void;
}) {
  return (
    <section
      className="artifact-panel"
      style={{
        flex: 1,
        overflowY: "auto",
        background: "#000",
        borderRadius: "1.5rem",
        border: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <div className="artifact-panel-inner">
        {view === "home" && <HomeArtifact data={data.snapshot} userId={data.userId} />}

        {view === "leads" && (
          <LeadsArtifact
            data={{
              userId: data.userId,
              icpId: null,
              icpDescription: data.bmoContext?.icp_description ?? "",
              defaultQuery: data.bmoContext?.linkedin_search_query ?? "",
              leads: data.leads,
            }}
            onAction={onAction}
            onDataChange={onLeadsChange}
          />
        )}

        {view === "sequences" && (
          <SequencesArtifact
            data={{
              userId: data.userId,
              leads: data.leads,
              selectedLead: data.selectedLead,
              bmoContext: data.bmoContext,
            }}
            onLeadMutate={onLeadMutate}
          />
        )}

        {view === "revenue" && (
          <RevenueArtifact
            data={{
              userId: data.userId,
              analysis: data.revenueAnalysis,
            }}
            onAnalysis={onRevenueAnalysis}
          />
        )}

        {view === "warroom" && (
          <WarRoomArtifact
            data={data.warRoom}
            userId={data.userId}
            onResult={onWarRoomResult}
          />
        )}

        {view === "agent" && (
          <WarRoomArtifact
            data={data.warRoom}
            userId={data.userId}
            onResult={onWarRoomResult}
          />
        )}

        {view === "integrations" && <IntegrationsArtifact />}
      </div>
    </section>
  );
}

export default ArtifactPanel;
