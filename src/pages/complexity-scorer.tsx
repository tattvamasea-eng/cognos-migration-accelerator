import { useState, useCallback } from "react";

// ── Data ─────────────────────────────────────────────────────────────────────

const VISUAL_TYPES = [
  { id: "bar_line_pie", label: "Bar / Line / Pie Charts", support: "full", weight: 0 },
  { id: "kpi_card", label: "KPI Cards / Text Items", support: "full", weight: 0 },
  { id: "crosstab", label: "Crosstab / Matrix", support: "partial", weight: 8 },
  { id: "list_table", label: "List / Data Table", support: "partial", weight: 5 },
  { id: "scatter_bubble", label: "Scatter / Bubble Charts", support: "full", weight: 2 },
  { id: "custom_visual", label: "Custom / ActiveX Visuals", support: "unsupported", weight: 20 },
  { id: "conditional_block", label: "Conditional Blocks", support: "unsupported", weight: 18 },
  { id: "burst_report", label: "Burst / Drill Reports", support: "unsupported", weight: 15 },
];

const CALC_TYPES = [
  { id: "simple_aggregate", label: "Simple Aggregates (SUM, COUNT, AVG)", weight: 2 },
  { id: "filtered_calc", label: "Filtered Calculations (STP Rate, Rated Cases)", weight: 6 },
  { id: "running_total", label: "Running Totals / Period-over-Period", weight: 10 },
  { id: "nested_calc", label: "Nested / Compound Expressions", weight: 14 },
  { id: "rank_percentile", label: "Rank / Percentile Functions", weight: 12 },
];

const FILTER_TYPES = [
  { id: "date_range", label: "Date Range Prompts", weight: 5 },
  { id: "multi_select", label: "Multi-Select Filters", weight: 3 },
  { id: "parameterized", label: "Parameterized / Cascading Filters", weight: 8 },
  { id: "detail_filter", label: "Detail-Level Query Filters", weight: 4 },
];

const RISK_FLAGS = [
  { id: "fiscal_calendar", label: "Non-standard fiscal calendar" },
  { id: "osfi_audit", label: "OSFI audit trail requirements" },
  { id: "pipeda_masking", label: "PIPEDA data masking / RLS" },
  { id: "multi_datasource", label: "Multiple data sources / joins" },
  { id: "realtime", label: "Near real-time refresh requirements" },
];

const COMPLEXITY_BANDS = {
  Low:    { color: "#22c55e", bg: "#052e16", border: "#16a34a", hours: [4, 8, 16] },
  Medium: { color: "#f59e0b", bg: "#2d1a00", border: "#d97706", hours: [16, 32, 48] },
  High:   { color: "#ef4444", bg: "#2d0a0a", border: "#dc2626", hours: [48, 80, 120] },
};

// ── Scoring ───────────────────────────────────────────────────────────────────

function computeScore(state) {
  let raw = 0;
  const drivers = [];
  const unsupported = [];

  // Visuals
  for (const vt of VISUAL_TYPES) {
    const count = state.visuals[vt.id] || 0;
    if (count > 0 && vt.weight > 0) {
      const pts = count * vt.weight;
      raw += pts;
      if (vt.support === "unsupported") {
        unsupported.push(`${count}× ${vt.label}`);
        drivers.push({ label: vt.label, count, pts, type: "danger" });
      } else {
        drivers.push({ label: vt.label, count, pts, type: "warn" });
      }
    }
  }

  // Calculations
  for (const ct of CALC_TYPES) {
    const count = state.calcs[ct.id] || 0;
    if (count > 0) {
      const pts = count * ct.weight;
      raw += pts;
      drivers.push({ label: ct.label, count, pts, type: pts >= 10 ? "warn" : "info" });
    }
  }

  // Filters
  for (const ft of FILTER_TYPES) {
    const count = state.filters[ft.id] || 0;
    if (count > 0) {
      const pts = count * ft.weight;
      raw += pts;
      drivers.push({ label: ft.label, count, pts, type: "info" });
    }
  }

  // Risk flags
  const flagCount = state.riskFlags.length;
  if (flagCount > 0) {
    const pts = flagCount * 6;
    raw += pts;
    drivers.push({ label: `Regulatory / risk flags`, count: flagCount, pts, type: "warn" });
  }

  const score = Math.min(raw, 100);
  const band = score <= 25 ? "Low" : score <= 55 ? "Medium" : "High";
  const { hours } = COMPLEXITY_BANDS[band];

  return { score, band, hours, drivers, unsupported };
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHeader({ icon, title, subtitle }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <span style={{
          fontFamily: "'DM Mono', 'Fira Code', monospace",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.12em",
          color: "#94a3b8",
          textTransform: "uppercase",
        }}>{title}</span>
      </div>
      {subtitle && (
        <p style={{ fontSize: 12, color: "#475569", margin: 0, paddingLeft: 24 }}>{subtitle}</p>
      )}
    </div>
  );
}

function CountInput({ label, support, value, onChange }) {
  const supportColors = {
    full: { dot: "#22c55e", tag: "#052e16", tagText: "#4ade80" },
    partial: { dot: "#f59e0b", tag: "#2d1a00", tagText: "#fbbf24" },
    unsupported: { dot: "#ef4444", tag: "#2d0a0a", tagText: "#f87171" },
  };
  const sc = supportColors[support] || supportColors.full;
  const supportLabel = { full: "Auto-map", partial: "Partial", unsupported: "Manual" };

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "10px 14px",
      background: value > 0 ? "rgba(99,102,241,0.06)" : "rgba(255,255,255,0.02)",
      border: `1px solid ${value > 0 ? "rgba(99,102,241,0.3)" : "rgba(255,255,255,0.06)"}`,
      borderRadius: 8,
      transition: "all 0.15s ease",
      gap: 8,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
        <div style={{
          width: 6, height: 6, borderRadius: "50%",
          background: sc.dot, flexShrink: 0,
        }} />
        <span style={{
          fontSize: 13, color: "#cbd5e1",
          fontFamily: "'DM Sans', sans-serif",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>{label}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <span style={{
          fontSize: 10, fontWeight: 600, letterSpacing: "0.06em",
          padding: "2px 7px", borderRadius: 4,
          background: sc.tag, color: sc.tagText,
          fontFamily: "'DM Mono', monospace",
        }}>{supportLabel[support]}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <button onClick={() => onChange(Math.max(0, value - 1))} style={{
            width: 24, height: 24, borderRadius: 4,
            background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
            color: "#94a3b8", cursor: "pointer", fontSize: 14, lineHeight: 1,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>−</button>
          <span style={{
            width: 28, textAlign: "center",
            fontFamily: "'DM Mono', monospace", fontSize: 13, fontWeight: 700,
            color: value > 0 ? "#a5b4fc" : "#475569",
          }}>{value}</span>
          <button onClick={() => onChange(value + 1)} style={{
            width: 24, height: 24, borderRadius: 4,
            background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
            color: "#94a3b8", cursor: "pointer", fontSize: 14, lineHeight: 1,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>+</button>
        </div>
      </div>
    </div>
  );
}

function FlagToggle({ id, label, checked, onChange }) {
  return (
    <label style={{
      display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
      padding: "9px 14px",
      background: checked ? "rgba(239,68,68,0.06)" : "rgba(255,255,255,0.02)",
      border: `1px solid ${checked ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.06)"}`,
      borderRadius: 8, transition: "all 0.15s ease",
    }}>
      <div style={{
        width: 16, height: 16, borderRadius: 4, flexShrink: 0,
        background: checked ? "#ef4444" : "transparent",
        border: `2px solid ${checked ? "#ef4444" : "#475569"}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "all 0.15s ease",
      }}>
        {checked && <span style={{ color: "#fff", fontSize: 10, lineHeight: 1 }}>✓</span>}
      </div>
      <input type="checkbox" checked={checked} onChange={onChange}
        style={{ display: "none" }} />
      <span style={{ fontSize: 13, color: checked ? "#fca5a5" : "#94a3b8",
        fontFamily: "'DM Sans', sans-serif" }}>{label}</span>
    </label>
  );
}

function ScoreGauge({ score, band }) {
  const bc = COMPLEXITY_BANDS[band];
  const pct = score;
  const circumference = 2 * Math.PI * 52;
  const offset = circumference * (1 - pct / 100);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
      <div style={{ position: "relative", width: 130, height: 130 }}>
        <svg width="130" height="130" style={{ transform: "rotate(-90deg)" }}>
          <circle cx="65" cy="65" r="52"
            fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
          <circle cx="65" cy="65" r="52"
            fill="none" stroke={bc.color} strokeWidth="10"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.6s cubic-bezier(0.4,0,0.2,1)" }}
          />
        </svg>
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
        }}>
          <span style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 28, fontWeight: 800, color: bc.color,
            lineHeight: 1,
          }}>{score}</span>
          <span style={{ fontSize: 10, color: "#475569", letterSpacing: "0.1em",
            fontFamily: "'DM Mono', monospace", marginTop: 2 }}>/ 100</span>
        </div>
      </div>
      <div style={{
        padding: "6px 20px", borderRadius: 20,
        background: bc.bg, border: `1px solid ${bc.border}`,
        fontFamily: "'DM Mono', monospace",
        fontSize: 13, fontWeight: 700, letterSpacing: "0.1em",
        color: bc.color,
      }}>{band.toUpperCase()} COMPLEXITY</div>
    </div>
  );
}

function EffortBar({ label, hours, color, isMain }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      opacity: isMain ? 1 : 0.55,
    }}>
      <span style={{
        width: 40, fontSize: 10, color: "#64748b",
        fontFamily: "'DM Mono', monospace", letterSpacing: "0.06em", flexShrink: 0,
      }}>{label}</span>
      <div style={{ flex: 1, height: isMain ? 10 : 6, background: "rgba(255,255,255,0.05)", borderRadius: 4 }}>
        <div style={{
          width: `${Math.min((hours / 120) * 100, 100)}%`,
          height: "100%", borderRadius: 4,
          background: isMain ? color : "rgba(255,255,255,0.15)",
          transition: "width 0.5s cubic-bezier(0.4,0,0.2,1)",
        }} />
      </div>
      <span style={{
        width: 52, textAlign: "right",
        fontFamily: "'DM Mono', monospace",
        fontSize: isMain ? 14 : 11,
        fontWeight: isMain ? 800 : 400,
        color: isMain ? color : "#475569",
        flexShrink: 0,
      }}>{hours}h</span>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function ComplexityScorer() {
  const [reportName, setReportName] = useState("Life_Insurance_UW_Summary");
  const [visuals, setVisuals] = useState({});
  const [calcs, setCalcs] = useState({});
  const [filters, setFilters] = useState({});
  const [riskFlags, setRiskFlags] = useState([]);
  const [exported, setExported] = useState(false);

  const state = { visuals, calcs, filters, riskFlags };
  const result = computeScore(state);
  const bc = COMPLEXITY_BANDS[result.band];

  const setVisual = useCallback((id, v) => setVisuals(p => ({ ...p, [id]: v })), []);
  const setCalc = useCallback((id, v) => setCalcs(p => ({ ...p, [id]: v })), []);
  const setFilter = useCallback((id, v) => setFilters(p => ({ ...p, [id]: v })), []);
  const toggleFlag = useCallback((id) =>
    setRiskFlags(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]), []);

  const handleExport = () => {
    const payload = {
      report_name: reportName,
      scored_at: new Date().toISOString(),
      complexity: result,
      inputs: state,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${reportName}_complexity.json`; a.click();
    URL.revokeObjectURL(url);
    setExported(true);
    setTimeout(() => setExported(false), 2000);
  };

  const handleReset = () => {
    setVisuals({}); setCalcs({}); setFilters({}); setRiskFlags([]);
    setReportName("Life_Insurance_UW_Summary");
  };

  const inputBase = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 8, color: "#e2e8f0",
    fontFamily: "'DM Mono', monospace", fontSize: 13,
    padding: "10px 14px", outline: "none", width: "100%", boxSizing: "border-box",
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#080d14",
      color: "#e2e8f0",
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      padding: "32px 16px",
    }}>
      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500;700&family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #0f172a; }
        ::-webkit-scrollbar-thumb { background: #334155; border-radius: 2px; }
        button:hover { opacity: 0.85; }
      `}</style>

      <div style={{ maxWidth: 1100, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 32, borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <div style={{
                  width: 8, height: 8, borderRadius: "50%", background: "#6366f1",
                  boxShadow: "0 0 10px #6366f1",
                }} />
                <span style={{
                  fontFamily: "'DM Mono', monospace", fontSize: 11,
                  letterSpacing: "0.2em", color: "#6366f1", fontWeight: 700,
                  textTransform: "uppercase",
                }}>Cognos → Power BI</span>
              </div>
              <h1 style={{
                margin: 0, fontSize: 26, fontWeight: 700,
                fontFamily: "'DM Sans', sans-serif",
                color: "#f1f5f9", letterSpacing: "-0.02em",
              }}>Migration Complexity Scorer</h1>
              <p style={{ margin: "6px 0 0", fontSize: 13, color: "#475569" }}>
                Score each Cognos report to estimate Power BI migration effort and risk
              </p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={handleReset} style={{
                padding: "8px 16px", borderRadius: 8, cursor: "pointer",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#94a3b8", fontSize: 13,
                fontFamily: "'DM Mono', monospace",
              }}>Reset</button>
              <button onClick={handleExport} style={{
                padding: "8px 20px", borderRadius: 8, cursor: "pointer",
                background: exported ? "#16a34a" : "#4f46e5",
                border: "none", color: "#fff", fontSize: 13, fontWeight: 600,
                fontFamily: "'DM Sans', sans-serif",
                transition: "background 0.2s ease",
              }}>{exported ? "✓ Exported" : "Export JSON"}</button>
            </div>
          </div>
          <a href="/" style={{
            fontSize: 11, color: "#6366f1", textDecoration: "none",
            fontFamily: "'DM Mono', monospace", letterSpacing: "0.1em",
            display: "inline-flex", alignItems: "center", gap: 4,
          }}>← Back to Demo</a>
          {/* Report Name */}
          <div style={{ marginTop: 20, maxWidth: 420 }}>
            <label style={{ fontSize: 11, color: "#475569", fontFamily: "'DM Mono', monospace",
              letterSpacing: "0.1em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
              Report Name
            </label>
            <input
              value={reportName}
              onChange={e => setReportName(e.target.value)}
              style={inputBase}
              placeholder="Enter Cognos report name..."
            />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 24, alignItems: "start" }}>

          {/* Left: Input Panels */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

            {/* Visuals */}
            <div style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 12, padding: 20,
            }}>
              <SectionHeader icon="📊" title="Visual Types"
                subtitle="Enter count of each visual type in the Cognos report" />
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {VISUAL_TYPES.map(vt => (
                  <CountInput key={vt.id} label={vt.label} support={vt.support}
                    value={visuals[vt.id] || 0}
                    onChange={v => setVisual(vt.id, v)} />
                ))}
              </div>
            </div>

            {/* Calculations */}
            <div style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 12, padding: 20,
            }}>
              <SectionHeader icon="⚡" title="Calculations & Measures"
                subtitle="Count of each calculation pattern requiring DAX translation" />
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {CALC_TYPES.map(ct => (
                  <CountInput key={ct.id} label={ct.label} support="full"
                    value={calcs[ct.id] || 0}
                    onChange={v => setCalc(ct.id, v)} />
                ))}
              </div>
            </div>

            {/* Filters */}
            <div style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 12, padding: 20,
            }}>
              <SectionHeader icon="🔽" title="Filters & Prompts"
                subtitle="Count of report filters and parameterized prompts" />
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {FILTER_TYPES.map(ft => (
                  <CountInput key={ft.id} label={ft.label} support="full"
                    value={filters[ft.id] || 0}
                    onChange={v => setFilter(ft.id, v)} />
                ))}
              </div>
            </div>

            {/* Risk Flags */}
            <div style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 12, padding: 20,
            }}>
              <SectionHeader icon="⚠️" title="Risk & Compliance Flags"
                subtitle="Check all that apply to this report" />
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {RISK_FLAGS.map(rf => (
                  <FlagToggle key={rf.id} id={rf.id} label={rf.label}
                    checked={riskFlags.includes(rf.id)}
                    onChange={() => toggleFlag(rf.id)} />
                ))}
              </div>
            </div>
          </div>

          {/* Right: Score Panel */}
          <div style={{ position: "sticky", top: 24 }}>
            <div style={{
              background: "rgba(255,255,255,0.02)",
              border: `1px solid ${bc.border}40`,
              borderRadius: 16, padding: 24,
              boxShadow: `0 0 40px ${bc.color}10`,
              transition: "all 0.4s ease",
            }}>
              {/* Gauge */}
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
                <ScoreGauge score={result.score} band={result.band} />
              </div>

              {/* Effort */}
              <div style={{
                background: "rgba(0,0,0,0.3)", borderRadius: 10, padding: 16, marginBottom: 20,
              }}>
                <div style={{ fontSize: 10, fontFamily: "'DM Mono', monospace",
                  letterSpacing: "0.12em", color: "#475569", marginBottom: 12,
                  textTransform: "uppercase" }}>Effort Estimate</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <EffortBar label="LOW" hours={result.hours[0]} color={bc.color} isMain={false} />
                  <EffortBar label="MID" hours={result.hours[1]} color={bc.color} isMain={true} />
                  <EffortBar label="HIGH" hours={result.hours[2]} color={bc.color} isMain={false} />
                </div>
              </div>

              {/* Risk */}
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "10px 14px",
                background: "rgba(0,0,0,0.2)", borderRadius: 8, marginBottom: 20,
              }}>
                <span style={{ fontSize: 12, color: "#64748b", fontFamily: "'DM Mono', monospace" }}>
                  Risk Level
                </span>
                <span style={{
                  fontSize: 12, fontWeight: 700, fontFamily: "'DM Mono', monospace",
                  color: result.band === "High" ? "#ef4444"
                       : result.band === "Medium" ? "#f59e0b" : "#22c55e",
                }}>
                  {result.unsupported.length > 0 ? "HIGH" : result.band.toUpperCase()}
                </span>
              </div>

              {/* Complexity Drivers */}
              {result.drivers.length > 0 && (
                <div>
                  <div style={{ fontSize: 10, fontFamily: "'DM Mono', monospace",
                    letterSpacing: "0.12em", color: "#475569", marginBottom: 10,
                    textTransform: "uppercase" }}>Score Drivers</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    {result.drivers.map((d, i) => (
                      <div key={i} style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        padding: "7px 10px",
                        background: "rgba(0,0,0,0.2)", borderRadius: 6,
                        borderLeft: `2px solid ${
                          d.type === "danger" ? "#ef4444"
                          : d.type === "warn" ? "#f59e0b" : "#6366f1"
                        }`,
                      }}>
                        <span style={{ fontSize: 11, color: "#94a3b8",
                          fontFamily: "'DM Sans', sans-serif",
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          maxWidth: 170 }}>{d.label}</span>
                        <span style={{
                          fontSize: 11, fontWeight: 700,
                          fontFamily: "'DM Mono', monospace",
                          color: d.type === "danger" ? "#f87171"
                               : d.type === "warn" ? "#fbbf24" : "#a5b4fc",
                          marginLeft: 8, flexShrink: 0,
                        }}>+{d.pts}pts</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Unsupported features warning */}
              {result.unsupported.length > 0 && (
                <div style={{
                  marginTop: 16, padding: 12,
                  background: "rgba(239,68,68,0.08)",
                  border: "1px solid rgba(239,68,68,0.3)",
                  borderRadius: 8,
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#f87171",
                    fontFamily: "'DM Mono', monospace", marginBottom: 6,
                    letterSpacing: "0.08em" }}>⚠ UNSUPPORTED FEATURES</div>
                  {result.unsupported.map((u, i) => (
                    <div key={i} style={{ fontSize: 11, color: "#fca5a5",
                      fontFamily: "'DM Sans', sans-serif", paddingLeft: 4 }}>• {u}</div>
                  ))}
                </div>
              )}

              {/* Empty state */}
              {result.drivers.length === 0 && (
                <div style={{ textAlign: "center", padding: "16px 0" }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>📋</div>
                  <div style={{ fontSize: 12, color: "#334155",
                    fontFamily: "'DM Sans', sans-serif" }}>
                    Enter report details to generate score
                  </div>
                </div>
              )}
            </div>

            {/* Legend */}
            <div style={{
              marginTop: 16, padding: 14,
              background: "rgba(255,255,255,0.01)",
              border: "1px solid rgba(255,255,255,0.05)",
              borderRadius: 10,
            }}>
              <div style={{ fontSize: 10, fontFamily: "'DM Mono', monospace",
                letterSpacing: "0.12em", color: "#334155", marginBottom: 10,
                textTransform: "uppercase" }}>Mapping Legend</div>
              {[
                { color: "#22c55e", label: "Auto-map", desc: "Full PBI equivalent" },
                { color: "#f59e0b", label: "Partial", desc: "Manual config required" },
                { color: "#ef4444", label: "Manual", desc: "No direct equivalent" },
              ].map(item => (
                <div key={item.label} style={{ display: "flex", alignItems: "center",
                  gap: 8, marginBottom: 5 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%",
                    background: item.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: "#64748b",
                    fontFamily: "'DM Mono', monospace", width: 62 }}>{item.label}</span>
                  <span style={{ fontSize: 11, color: "#334155",
                    fontFamily: "'DM Sans', sans-serif" }}>{item.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
