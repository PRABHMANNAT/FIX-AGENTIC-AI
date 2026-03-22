"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CircleDot,
  Command,
  DollarSign,
  LayoutGrid,
  LogOut,
  Megaphone,
  Rocket,
  Settings,
  Shield,
  Terminal,
  UserRound,
} from "lucide-react";
import { createBrowserClient } from "@/lib/supabase";
import type { DashboardArtifactView } from "@/types";

const NAV_ITEMS: Array<{
  id: DashboardArtifactView;
  label: string;
  icon: typeof LayoutGrid;
  hex: string;
}> = [
  {
    id: "home",
    label: "Command Core",
    icon: LayoutGrid,
    hex: "#F5F5F5",
  },
  {
    id: "agent",
    label: "War Room Blitz",
    icon: Command,
    hex: "#FB923C",
  },
  {
    id: "leads",
    label: "Find Customers",
    icon: Terminal,
    hex: "#FB7185",
  },
  {
    id: "sequences",
    label: "Outbound AI",
    icon: Shield,
    hex: "#00FF88",
  },
  {
    id: "revenue",
    label: "Revenue Intel",
    icon: Rocket,
    hex: "#22D3EE",
  },
  {
    id: "finance" as DashboardArtifactView,
    label: "Finance AI",
    icon: DollarSign,
    hex: "#A78BFA",
  },
  {
    id: "social" as DashboardArtifactView,
    label: "Social",
    icon: Megaphone,
    hex: "#F472B6",
  },
  {
    id: "warroom",
    label: "Lead Triage",
    icon: CircleDot,
    hex: "#FACC15",
  },
];

function SidebarButton({
  active,
  expanded,
  icon: Icon,
  label,
  hex,
  onClick,
}: {
  active: boolean;
  expanded: boolean;
  icon: typeof LayoutGrid;
  label: string;
  hex: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="relative flex w-full items-center transition-all duration-200"
      style={{
        minHeight: 44,
        justifyContent: expanded ? "flex-start" : "center",
        padding: expanded ? "0 14px" : "0",
        border: "none",
        borderRadius: expanded ? 14 : 999,
        background: active ? "rgba(255,255,255,0.045)" : "transparent",
        cursor: "pointer",
      }}
    >
      {active ? (
        <span
          style={{
            position: "absolute",
            left: 8,
            width: 4,
            height: 18,
            borderRadius: 999,
            background: hex,
            boxShadow: `0 0 14px ${hex}`,
          }}
        />
      ) : null}

      <span
        className="flex items-center justify-center"
        style={{
          width: 40,
          height: 40,
          borderRadius: 999,
          color: active ? hex : "rgba(255,255,255,0.44)",
          background: active ? "rgba(255,255,255,0.025)" : "transparent",
          boxShadow: active ? `inset 0 0 0 1px ${hex}22, 0 0 18px ${hex}22` : "none",
          transition: "all 0.2s ease",
          flexShrink: 0,
        }}
      >
        <Icon
          size={17}
          strokeWidth={1.9}
          style={{
            filter: active ? `drop-shadow(0 0 8px ${hex}99)` : "none",
          }}
        />
      </span>

      {expanded ? (
        <span
          style={{
            marginLeft: 12,
            fontFamily: "var(--font-ui)",
            fontSize: 13,
            fontWeight: active ? 600 : 500,
            color: active ? "#fff" : "rgba(255,255,255,0.58)",
            whiteSpace: "nowrap",
            animation: "fade-in 0.18s ease",
          }}
        >
          {label}
        </span>
      ) : null}
    </button>
  );
}

export default function IconSidebar({
  activePanel,
  onSwitch,
  userName = "Founder",
  userInitial = "F",
}: {
  activePanel: DashboardArtifactView;
  onSwitch: (panel: DashboardArtifactView) => void;
  userName?: string;
  userInitial?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const supabase = createBrowserClient();
  const router = useRouter();

  async function handleSignOut() {
    await supabase?.auth.signOut();
    document.cookie = "ao_onboarded=; Path=/; Max-Age=0; SameSite=Lax";
    window.localStorage.removeItem("assembleone_bmo_config");
    router.push("/");
  }

  return (
    <aside
      className="relative z-50 flex flex-shrink-0 flex-col overflow-hidden transition-all duration-300 ease-out"
      style={{
        width: expanded ? 236 : 76,
        height: "min(560px, calc(100vh - 48px))",
        margin: "24px 20px 24px 16px",
        alignSelf: "center",
        background:
          "linear-gradient(180deg, rgba(20,20,20,0.97) 0%, rgba(13,13,13,0.97) 100%)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: expanded ? "6%" : 999,
        boxShadow:
          "0 30px 70px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.04), inset 0 -1px 0 rgba(255,255,255,0.03)",
        backdropFilter: "blur(24px)",
      }}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      <div
        className="flex h-full flex-col items-center"
        style={{ padding: expanded ? "14px 10px" : "14px 8px" }}
      >
        <div
          className="flex w-full items-center"
          style={{
            justifyContent: expanded ? "flex-start" : "center",
            padding: expanded ? "0 10px" : "0",
            marginBottom: 14,
          }}
        >
          <div
            className="flex items-center justify-center"
            style={{
              width: 40,
              height: 40,
              borderRadius: 999,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#FFFFFF",
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-bebas)",
                fontSize: 18,
                letterSpacing: "0.04em",
                lineHeight: 1,
              }}
            >
              A
            </span>
          </div>

          {expanded ? (
            <div style={{ marginLeft: 12, animation: "fade-in 0.18s ease" }}>
              <div
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#fff",
                }}
              >
                {userName}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 9,
                  letterSpacing: "0.18em",
                  color: "rgba(255,255,255,0.34)",
                  textTransform: "uppercase",
                  marginTop: 2,
                }}
              >
                Central Growth
              </div>
            </div>
          ) : null}
        </div>

        <div
          style={{
            width: expanded ? "calc(100% - 20px)" : 44,
            height: 1,
            background: "rgba(255,255,255,0.06)",
            marginBottom: 14,
          }}
        />

        <nav
          className="flex w-full flex-1 flex-col items-center justify-center"
          style={{ gap: 8 }}
        >
          {NAV_ITEMS.map((item) => (
            <SidebarButton
              key={item.id}
              active={activePanel === item.id}
              expanded={expanded}
              icon={item.icon}
              label={item.label}
              hex={item.hex}
              onClick={() => {
                if (item.id === ("finance" as DashboardArtifactView)) {
                  router.push("/dashboard/finance");
                } else if (item.id === ("social" as DashboardArtifactView)) {
                  router.push("/social");
                } else {
                  onSwitch(item.id);
                }
              }}
            />
          ))}
        </nav>

        <div
          style={{
            width: expanded ? "calc(100% - 20px)" : 44,
            height: 1,
            background: "rgba(255,255,255,0.06)",
            margin: "14px 0 10px",
          }}
        />

        <div
          className="flex w-full flex-col items-center"
          style={{ gap: 8 }}
        >
          <SidebarButton
            active={activePanel === "integrations"}
            expanded={expanded}
            icon={Settings}
            label="Settings"
            hex="#8B8B8B"
            onClick={() => onSwitch("integrations")}
          />

          {expanded ? (
            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="flex w-full items-center"
              style={{
                minHeight: 40,
                padding: "0 14px",
                border: "none",
                borderRadius: 14,
                background: "transparent",
                cursor: "pointer",
              }}
            >
              <span
                className="flex items-center justify-center"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 999,
                  color: "rgba(255,255,255,0.42)",
                }}
              >
                <LogOut size={16} strokeWidth={1.8} />
              </span>
              <span
                style={{
                  marginLeft: 12,
                  fontFamily: "var(--font-ui)",
                  fontSize: 13,
                  fontWeight: 500,
                  color: "rgba(255,255,255,0.5)",
                  animation: "fade-in 0.18s ease",
                }}
              >
                Sign out
              </span>
            </button>
          ) : null}

          <button
            type="button"
            aria-label={`${userName} profile`}
            title={userName}
            className="flex w-full items-center"
            style={{
              minHeight: 48,
              justifyContent: expanded ? "flex-start" : "center",
              padding: expanded ? "0 10px" : "0",
              border: "none",
              borderRadius: expanded ? 14 : 999,
              background: "transparent",
              cursor: "default",
            }}
          >
            <span
              className="flex items-center justify-center"
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: "#F4F4F4",
                color: "#111111",
                boxShadow: "0 8px 18px rgba(0,0,0,0.18)",
                flexShrink: 0,
              }}
            >
              {expanded ? (
                <span
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  {userInitial}
                </span>
              ) : (
                <UserRound size={16} strokeWidth={1.8} />
              )}
            </span>

            {expanded ? (
              <div style={{ marginLeft: 12, animation: "fade-in 0.18s ease" }}>
                <div
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#fff",
                    lineHeight: 1.1,
                  }}
                >
                  {userName}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 9,
                    letterSpacing: "0.14em",
                    color: "rgba(255,255,255,0.34)",
                    textTransform: "uppercase",
                    marginTop: 3,
                  }}
                >
                  Founder
                </div>
              </div>
            ) : null}
          </button>
        </div>
      </div>
    </aside>
  );
}
