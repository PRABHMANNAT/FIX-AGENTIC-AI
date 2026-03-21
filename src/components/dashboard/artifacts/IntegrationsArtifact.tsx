import { Database, Mail, Radar, Sparkles } from "lucide-react";

const services = [
  { name: "Supabase", icon: Database, color: "var(--green)" },
  { name: "OpenAI", icon: Sparkles, color: "var(--violet)" },
  { name: "Apify", icon: Radar, color: "var(--gold)" },
  { name: "Resend", icon: Mail, color: "var(--ember)" },
];

export function IntegrationsArtifact() {
  return (
    <>
      <div className="artifact-header">
        <div className="artifact-header-left">
          <div className="artifact-icon" style={{ background: "var(--surface)" }}>
            <Database size={18} color="var(--text-2)" />
          </div>
          <div>
            <div className="artifact-title">INTEGRATIONS</div>
            <div className="artifact-subtitle">CONNECTED SERVICES · SYSTEM SURFACE</div>
          </div>
        </div>
        <div className="artifact-badge badge-ready">CONFIG</div>
      </div>

      <div className="subroutines-grid">
        {services.map((service) => {
          const Icon = service.icon;
          return (
            <div key={service.name} className="subroutine-card">
              <div className="subroutine-top">
                <div className="sub-icon" style={{ borderColor: `${service.color}33` }}>
                  <Icon size={16} color={service.color} strokeWidth={2} />
                </div>
                <span className="artifact-badge badge-active">CONNECTED</span>
              </div>
              <div className="sub-name">{service.name}</div>
              <div className="sub-stat">ready for execution</div>
            </div>
          );
        })}
      </div>
    </>
  );
}

export default IntegrationsArtifact;
