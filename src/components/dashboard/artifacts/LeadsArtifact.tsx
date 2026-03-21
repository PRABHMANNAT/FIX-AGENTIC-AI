"use client";

import { Mail, Target } from "lucide-react";
import { useEffect, useState } from "react";
import type { Lead } from "@/types";

function LeadCard({
  lead,
  index,
  onAction,
}: {
  lead: Lead;
  index: number;
  onAction?: (action: string, payload?: unknown) => void;
}) {
  const high = lead.icp_score >= 80 ? "high" : lead.icp_score >= 60 ? "mid" : "low";

  return (
    <div className="lead-card" style={{ animationDelay: `${index * 0.06}s` }}>
      <div className="lead-top">
        <div className="flex items-start gap-3">
          <div className="lead-avatar">{lead.name.charAt(0)}</div>
          <div>
            <div className="lead-name">{lead.name}</div>
            <div className="lead-role">
              {[lead.role, lead.company].filter(Boolean).join(" · ")}
            </div>
          </div>
        </div>
        <span
          className={`lead-source-badge ${lead.source === "linkedin" ? "source-linkedin" : "source-github"}`}
        >
          {lead.source}
        </span>
      </div>

      <div className="score-row">
        <div className="score-line">
          <span className="score-label">MATCH</span>
          <div className="score-bar">
            <div className="score-fill match" style={{ width: `${lead.icp_score}%` }} />
          </div>
          <span className={`score-num ${high}`}>{lead.icp_score}</span>
        </div>
        <div className="score-line">
          <span className="score-label">INTENT</span>
          <div className="score-bar">
            <div className="score-fill intent" style={{ width: `${lead.intent_score}%` }} />
          </div>
          <span className="score-num mid">{lead.intent_score}</span>
        </div>
      </div>

      <div className="lead-signals">
        {lead.signals.slice(0, 3).map((signal) => (
          <span key={signal} className="signal-pill">
            {signal}
          </span>
        ))}
      </div>

      <div className="lead-actions">
        <button type="button" className="lead-btn" onClick={() => onAction?.("open_sequences", lead)}>
          <Mail size={12} />
          Draft Email
        </button>
      </div>
    </div>
  );
}

export function LeadsArtifact({
  data,
  onAction,
  onDataChange,
}: {
  data: {
    userId: string | null;
    icpId: string | null;
    icpDescription: string;
    defaultQuery: string;
    leads: Lead[];
  };
  onAction?: (action: string, payload?: unknown) => void;
  onDataChange?: (leads: Lead[]) => void;
}) {
  const [searching, setSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState(data.defaultQuery || "");
  const [leads, setLeads] = useState<Lead[]>(data.leads || []);
  const [count, setCount] = useState(25);

  useEffect(() => {
    setSearchQuery(data.defaultQuery || "");
    setLeads(data.leads || []);
  }, [data.defaultQuery, data.leads]);

  useEffect(() => {
    if (!data.userId) {
      return;
    }

    let active = true;

    const loadContext = async () => {
      try {
        const [icpResponse, leadsResponse] = await Promise.all([
          fetch(`/api/icp?user_id=${data.userId}`, { cache: "no-store" }),
          fetch(`/api/leads?user_id=${data.userId}&limit=50&sort_by=icp_score`, {
            cache: "no-store",
          }),
        ]);

        const icpPayload = (await icpResponse.json()) as {
          icps?: Array<{
            description?: string | null;
            linkedin_query?: string | null;
          }>;
        };
        const leadsPayload = (await leadsResponse.json()) as { leads?: Lead[] };

        if (!active) {
          return;
        }

        const activeIcp = icpPayload.icps?.[0];
        setSearchQuery(
          activeIcp?.linkedin_query ||
            activeIcp?.description ||
            data.defaultQuery ||
            data.icpDescription ||
            "",
        );

        if (leadsPayload.leads?.length) {
          setLeads(leadsPayload.leads);
          onDataChange?.(leadsPayload.leads);
        }
      } catch {
        if (active) {
          setSearchQuery(data.defaultQuery || data.icpDescription || "");
        }
      }
    };

    void loadContext();

    return () => {
      active = false;
    };
  }, [data.defaultQuery, data.icpDescription, data.userId, onDataChange]);

  async function runSearch() {
    setSearching(true);

    try {
      const response = await fetch("/api/leads/scrape", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          search_query: searchQuery,
          count,
          sources: ["linkedin", "github"],
          user_id: data.userId,
          icp_id: data.icpId,
          icp_description: data.icpDescription,
        }),
      });

      const result = (await response.json()) as { leads?: Lead[] };
      const nextLeads = result.leads ?? [];
      setLeads(nextLeads);
      onDataChange?.(nextLeads);
    } finally {
      setSearching(false);
    }
  }

  return (
    <>
      <div className="artifact-header">
        <div className="artifact-header-left">
          <div
            className="artifact-icon"
            style={{
              background: "var(--green-dim)",
              border: "1px solid rgba(0,255,136,0.2)",
            }}
          >
            <Target size={18} color="var(--green)" />
          </div>
          <div>
            <div className="artifact-title">CUSTOMER FINDER</div>
            <div className="artifact-subtitle">LIVE SEARCH · LINKEDIN + GITHUB</div>
          </div>
        </div>
        {leads.length > 0 ? <div className="artifact-badge badge-active">{leads.length} FOUND</div> : null}
      </div>

      <div className="search-config">
        <div className="search-label">Who are you looking for?</div>
        <textarea
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          className="search-textarea"
          rows={2}
          placeholder="e.g. office workers near Broadway Sydney"
        />
        <div className="search-controls">
          <div className="count-selector">
            {[10, 25, 50].map((value) => (
              <button
                key={value}
                type="button"
                className={`count-btn ${count === value ? "active" : ""}`}
                onClick={() => setCount(value)}
              >
                {value}
              </button>
            ))}
          </div>
          <button type="button" className="find-btn" onClick={() => void runSearch()} disabled={searching}>
            {searching ? "SEARCHING..." : "FIND CUSTOMERS →"}
          </button>
        </div>
      </div>

      {searching ? (
        <div className="search-progress">
          <div className="progress-line">
            <span className="progress-source">LINKEDIN</span>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: "60%", background: "var(--violet)" }} />
            </div>
          </div>
          <div className="progress-line">
            <span className="progress-source">GITHUB</span>
            <div className="progress-bar">
              <div className="progress-fill animate-scan" />
            </div>
          </div>
          <div className="progress-line">
            <span className="progress-source">AI SCORING</span>
            <div className="progress-bar">
              <div className="progress-fill-waiting" />
            </div>
          </div>
          <div className="search-count-live">Searching... finding best matches</div>
        </div>
      ) : null}

      {leads.length > 0 && !searching ? (
        <>
          <div className="leads-filter-bar">
            <div className="leads-total">{leads.length} customers found</div>
            <div className="filter-pills">
              {["All", "New", "Contacted", "Interested"].map((filter) => (
                <button key={filter} type="button" className="filter-pill">
                  {filter}
                </button>
              ))}
            </div>
          </div>

          <div className="leads-grid">
            {leads.map((lead, index) => (
              <LeadCard key={lead.id} lead={lead} index={index} onAction={onAction} />
            ))}
          </div>
        </>
      ) : null}

      {!leads.length && !searching ? (
        <div className="empty-state">
          <Target size={32} color="var(--text-4)" />
          <div className="empty-title">No customers found yet</div>
          <div className="empty-desc">
            Run your first search to find people who match your business.
          </div>
        </div>
      ) : null}
    </>
  );
}

export default LeadsArtifact;
