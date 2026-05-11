import React, { useState } from "react";

const styles = `
* { box-sizing: border-box; margin: 0; padding: 0; }
.cognos-demo-root { font-family: 'Segoe UI', system-ui, sans-serif; background: #f8f9fb; color: #1a1d23; min-height: 100vh; }
.top-nav { background: #fff; border-bottom: 1px solid #e2e5ea; display: flex; align-items: center; padding: 0 24px; height: 56px; position: sticky; top: 0; z-index: 100; }
.nav-brand { font-size: 13px; font-weight: 600; color: #0d6efd; margin-right: 32px; display: flex; align-items: center; gap: 8px; white-space: nowrap; }
.nav-brand span { color: #6c757d; font-weight: 400; }
.tab-btn { height: 56px; padding: 0 20px; border: none; background: none; cursor: pointer; font-size: 13px; font-weight: 500; color: #6c757d; border-bottom: 2px solid transparent; display: flex; align-items: center; gap: 7px; white-space: nowrap; }
.tab-btn:hover { color: #1a1d23; }
.tab-btn.active { color: #0d6efd; border-bottom-color: #0d6efd; }
.panel { padding: 28px; max-width: 1100px; margin: 0 auto; }
.section-title { font-size: 18px; font-weight: 600; margin-bottom: 4px; }
.section-sub { font-size: 13px; color: #6c757d; margin-bottom: 24px; }
.card { background: #fff; border: 1px solid #e2e5ea; border-radius: 10px; padding: 20px 22px; margin-bottom: 16px; }
.card-title { font-size: 12px; font-weight: 600; color: #6c757d; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 14px; }
.score-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
label { display: block; font-size: 12px; font-weight: 600; color: #495057; margin-bottom: 5px; }
select, input { width: 100%; border: 1px solid #d0d5dd; border-radius: 6px; padding: 8px 10px; font-size: 13px; background: #fff; color: #1a1d23; margin-bottom: 10px; }
.risk-flags { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 6px; }
.risk-flag { padding: 5px 10px; border-radius: 5px; background: #f8f9fb; border: 1px solid #e2e5ea; font-size: 12px; cursor: pointer; }
.risk-flag.selected { background: #fff0f0; border-color: #fca5a5; color: #991b1b; }
.score-result { background: #fff; border: 1px solid #e2e5ea; border-radius: 10px; padding: 24px; text-align: center; }
.score-badge { display: inline-block; padding: 6px 20px; border-radius: 20px; font-size: 13px; font-weight: 700; margin-bottom: 12px; }
.badge-low { background: #d1fae5; color: #065f46; }
.badge-medium { background: #fef3c7; color: #92400e; }
.badge-high { background: #fee2e2; color: #991b1b; }
.score-number { font-size: 52px; font-weight: 700; line-height: 1; margin-bottom: 6px; }
.score-low { color: #10b981; } .score-med { color: #f59e0b; } .score-high { color: #ef4444; }
.score-effort { font-size: 13px; color: #6c757d; margin-bottom: 16px; }
.driver-item { display: flex; justify-content: space-between; padding: 7px 0; border-bottom: 1px solid #f0f2f4; font-size: 12px; }
.btn-primary { background: #0d6efd; color: #fff; border: none; border-radius: 6px; padding: 9px 18px; font-size: 13px; font-weight: 600; cursor: pointer; margin-top: 12px; }
.btn-secondary { background: #fff; color: #0d6efd; border: 1px solid #0d6efd; border-radius: 6px; padding: 9px 18px; font-size: 13px; font-weight: 600; cursor: pointer; margin-top: 12px; margin-left: 8px; }
.step-row { display: flex; align-items: center; gap: 12px; padding: 10px 0; }
.step-icon { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; flex-shrink: 0; transition: all 0.4s; }
.step-icon.idle { background: #f0f2f4; color: #adb5bd; }
.step-icon.running { background: #dbeafe; color: #1d4ed8; animation: pulse 1s infinite; }
.step-icon.done { background: #d1fae5; color: #059669; }
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
.step-info { flex: 1; }
.step-name { font-size: 13px; font-weight: 600; }
.step-desc { font-size: 11px; color: #6c757d; margin-top: 1px; }
.step-status { font-size: 11px; font-weight: 600; }
.step-status.done { color: #059669; } .step-status.running { color: #1d4ed8; } .step-status.idle { color: #adb5bd; }
.step-connector { width: 2px; height: 12px; background: #e2e5ea; margin-left: 15px; }
.step-connector.done { background: #10b981; }
.progress-bar { height: 6px; background: #e2e5ea; border-radius: 3px; margin: 16px 0; overflow: hidden; }
.progress-fill { height: 100%; background: #0d6efd; border-radius: 3px; transition: width 0.5s ease; }
.result-tabs { display: flex; border-bottom: 1px solid #e2e5ea; margin-bottom: 16px; }
.result-tab { padding: 8px 16px; font-size: 12px; font-weight: 600; color: #6c757d; border: none; background: none; cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -1px; }
.result-tab.active { color: #0d6efd; border-bottom-color: #0d6efd; }
.json-block { background: #0d1117; color: #e6edf3; border-radius: 8px; padding: 16px; font-family: monospace; font-size: 11px; line-height: 1.7; overflow: auto; max-height: 380px; white-space: pre; }
.dax-block { background: #1e1e2e; color: #cdd6f4; border-radius: 8px; padding: 16px; font-family: monospace; font-size: 11px; line-height: 1.8; overflow: auto; max-height: 380px; white-space: pre; }
.summary-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; margin-bottom: 16px; }
.stat-card { background: #f8f9fb; border-radius: 8px; padding: 14px 16px; text-align: center; }
.stat-val { font-size: 22px; font-weight: 700; }
.stat-lbl { font-size: 11px; color: #6c757d; margin-top: 3px; }
.warning-item { display: flex; gap: 8px; padding: 8px 12px; background: #fffbeb; border: 1px solid #fcd34d; border-radius: 6px; font-size: 12px; color: #92400e; margin-bottom: 6px; }
.pbi-nav { display: flex; border: 1px solid #e2e5ea; border-radius: 10px 10px 0 0; overflow: hidden; }
.pbi-tab { padding: 11px 16px; font-size: 12px; font-weight: 600; color: #6c757d; border: none; background: none; cursor: pointer; border-bottom: 2px solid transparent; white-space: nowrap; }
.pbi-tab.active { color: #0d6efd; background: #f0f6ff; border-bottom-color: #0d6efd; }
.pbi-content { background: #fff; border: 1px solid #e2e5ea; border-top: none; border-radius: 0 0 10px 10px; padding: 20px; }
.kpi-row { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; margin-bottom: 16px; }
.kpi-card { background: #fff; border: 1px solid #e2e5ea; border-radius: 8px; padding: 16px 18px; }
.kpi-label { font-size: 11px; color: #6c757d; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
.kpi-val { font-size: 24px; font-weight: 700; margin: 4px 0 2px; }
.kpi-up { color: #059669; } .kpi-down { color: #dc2626; }
.chart-wrap { background: #fff; border: 1px solid #e2e5ea; border-radius: 8px; padding: 16px 18px; margin-bottom: 16px; }
.chart-title { font-size: 12px; font-weight: 600; color: #6c757d; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; }
.bar-chart { display: flex; align-items: flex-end; gap: 8px; height: 160px; }
.bar-col { display: flex; flex-direction: column; align-items: center; gap: 4px; flex: 1; }
.bar { width: 100%; border-radius: 4px 4px 0 0; }
.bar-lbl { font-size: 10px; color: #6c757d; }
.bar-val { font-size: 10px; font-weight: 600; }
table { width: 100%; border-collapse: collapse; font-size: 12px; }
th { text-align: left; padding: 8px 10px; background: #f8f9fb; color: #6c757d; font-weight: 600; font-size: 11px; text-transform: uppercase; border-bottom: 1px solid #e2e5ea; }
td { padding: 8px 10px; border-bottom: 1px solid #f0f2f4; }
.pill { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 700; }
.pill-green { background: #d1fae5; color: #065f46; }
.pill-yellow { background: #fef3c7; color: #92400e; }
.pill-red { background: #fee2e2; color: #991b1b; }
.pill-blue { background: #dbeafe; color: #1e40af; }
.mini-bar-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.mini-bar-label { font-size: 11px; color: #495057; width: 100px; flex-shrink: 0; }
.mini-bar-track { flex: 1; height: 8px; background: #f0f2f4; border-radius: 4px; overflow: hidden; }
.mini-bar-fill { height: 100%; border-radius: 4px; }
.mini-bar-val { font-size: 11px; font-weight: 600; width: 36px; text-align: right; }
`;

const STEPS = [
  { name: "XML Extractor", desc: "Parse Cognos report spec, extract visuals, queries, filters" },
  { name: "IR Generator", desc: "Convert to intermediate representation (schema-agnostic)" },
  { name: "Rule Engine", desc: "Apply mapping rules: Cognos to Power BI visual types + DAX patterns" },
  { name: "Complexity Scorer", desc: "Score each visual, compute aggregate effort estimate" },
  { name: "Validator", desc: "Check DAX syntax, OSFI/PIPEDA flags, referential integrity" },
];

const WEIGHTS = {
  visType: { basic: 5, cross: 18, custom: 28, geo: 22 },
  calcType: { simple: 5, medium: 14, complex: 26 },
  filterType: { static: 4, dynamic: 12, parameterized: 18 },
};

const RECS = {
  LOW: ["Straightforward migration - automate with standard rule set","Use Power BI Desktop import mode for all queries","Estimated 1-2 sprints to complete","Unit-test each visual mapping before handoff"],
  MEDIUM: ["Assign a Power BI SME for DAX measure validation","Manually validate all drill-through paths post-migration","Matrix visuals require layout review in Power BI service","Schedule OSFI/PIPEDA compliance review before publish"],
  HIGH: ["Requires senior BI architect - do not automate without review","Custom visuals may need AppSource replacements or custom dev","Row-level security must be re-implemented and UAT tested","Allocate 2-3 sprints minimum; include QA and sign-off phases"],
};

const RISK_FLAGS = [
  { label: "Report Bursting", val: 12 },
  { label: "Complex Layout", val: 8 },
  { label: "Multi-language", val: 10 },
  { label: "Drill-through", val: 7 },
  { label: "Row-level Security", val: 9 },
  { label: "OSFI / PIPEDA flags", val: 11 },
];

function calcScore(state) {
  const v = state.numVisuals * 1 || 0;
  const q = state.numQueries * 1 || 0;
  const f = state.numFilters * 1 || 0;
  const vt = WEIGHTS.visType[state.visType] || 0;
  const ct = WEIGHTS.calcType[state.calcType] || 0;
  const ft = WEIGHTS.filterType[state.filterType] || 0;
  const riskPts = state.risks.reduce((a, r) => a + r, 0);
  const drivers = [
    { name: "Visual count", pts: Math.min(v * 2, 20) },
    { name: "Query complexity", pts: Math.min(q * 3, 12) },
    { name: "Visual type", pts: vt },
    { name: "Calculation type", pts: ct },
    { name: "Filter complexity", pts: ft + Math.min(f * 1.5, 12) },
    { name: "Risk flags", pts: riskPts },
  ];
  const total = Math.min(Math.round(drivers.reduce((a, d) => a + d.pts, 0)), 100);
  const tier = total <= 33 ? "LOW" : total <= 66 ? "MEDIUM" : "HIGH";
  return { total, tier, drivers, effort: tier === "LOW" ? "1-2 days" : tier === "MEDIUM" ? "3-5 days" : "6-12+ days" };
}

function ScoreTab() {
  const [form, setForm] = useState({ reportName: "UW_LifeIns_Mortality_Qtly", numVisuals: 9, numQueries: 2, numFilters: 4, visType: "cross", calcType: "medium", filterType: "dynamic" });
  const [risks, setRisks] = useState([8, 7, 11]);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toggleRisk = (val) => setRisks(r => r.includes(val) ? r.filter(x => x !== val) : [...r, val]);
  const { total, tier, drivers, effort } = calcScore({ ...form, risks });
  const badgeClass = tier === "LOW" ? "badge-low" : tier === "MEDIUM" ? "badge-medium" : "badge-high";
  const numClass = tier === "LOW" ? "score-low" : tier === "MEDIUM" ? "score-med" : "score-high";
  return (
    React.createElement("div", { className: "panel" },
      React.createElement("div", { className: "section-title" }, "Complexity Scorer"),
      React.createElement("div", { className: "section-sub" }, "Evaluate a Cognos report and estimate migration effort to Power BI"),
      React.createElement("div", { className: "score-grid" },
        React.createElement("div", { className: "card" },
          React.createElement("div", { className: "card-title" }, "Report Information"),
          React.createElement("label", null, "Report Name"),
          React.createElement("input", { type: "text", value: form.reportName, onChange: e => set("reportName", e.target.value) }),
          React.createElement("div", { className: "score-grid", style: { marginBottom: 0 } },
            React.createElement("div", null, React.createElement("label", null, "Visuals"), React.createElement("input", { type: "number", value: form.numVisuals, onChange: e => set("numVisuals", e.target.value) })),
            React.createElement("div", null, React.createElement("label", null, "Queries"), React.createElement("input", { type: "number", value: form.numQueries, onChange: e => set("numQueries", e.target.value) }))
          )
        ),
        React.createElement("div", { className: "card" },
          React.createElement("div", { className: "card-title" }, "Visual and Calc Types"),
          React.createElement("label", null, "Primary Visual"),
          React.createElement("select", { value: form.visType, onChange: e => set("visType", e.target.value) },
            React.createElement("option", { value: "basic" }, "Tables / Basic charts"),
            React.createElement("option", { value: "cross" }, "Crosstabs / Matrixes"),
            React.createElement("option", { value: "custom" }, "Custom visualizations"),
            React.createElement("option", { value: "geo" }, "Geo / Maps")
          ),
          React.createElement("label", null, "Calculation Complexity"),
          React.createElement("select", { value: form.calcType, onChange: e => set("calcType", e.target.value) },
            React.createElement("option", { value: "simple" }, "Simple (sums, counts)"),
            React.createElement("option", { value: "medium" }, "Medium (ratios, % change)"),
            React.createElement("option", { value: "complex" }, "Complex (actuarial, nested)")
          )
        )
      ),
      React.createElement("div", { className: "score-grid" },
        React.createElement("div", { className: "card" },
          React.createElement("div", { className: "card-title" }, "Filters"),
          React.createElement("label", null, "Number of Prompt Filters"),
          React.createElement("input", { type: "number", value: form.numFilters, onChange: e => set("numFilters", e.target.value) }),
          React.createElement("label", null, "Filter Type"),
          React.createElement("select", { value: form.filterType, onChange: e => set("filterType", e.target.value) },
            React.createElement("option", { value: "static" }, "Static filters only"),
            React.createElement("option", { value: "dynamic" }, "Dynamic / cascading"),
            React.createElement("option", { value: "parameterized" }, "Fully parameterized")
          )
        ),
        React.createElement("div", { className: "card" },
          React.createElement("div", { className: "card-title" }, "Risk Flags"),
          React.createElement("div", { className: "risk-flags" },
            RISK_FLAGS.map(r => React.createElement("div", { key: r.val, className: "risk-flag" + (risks.includes(r.val) ? " selected" : ""), onClick: () => toggleRisk(r.val) }, r.label))
          )
        )
      ),
      React.createElement("div", { className: "score-grid" },
        React.createElement("div", { className: "score-result" },
          React.createElement("div", { className: "score-badge " + badgeClass }, tier + " COMPLEXITY"),
          React.createElement("div", { className: "score-number " + numClass }, total),
          React.createElement("div", { className: "score-effort" }, "Estimated effort: " + effort),
          React.createElement("div", { style: { textAlign: "left", marginTop: 12 } },
            React.createElement("div", { className: "card-title" }, "Score Drivers"),
            drivers.map(d => React.createElement("div", { key: d.name, className: "driver-item" }, React.createElement("span", null, d.name), React.createElement("span", { style: { fontWeight: 600 } }, "+" + Math.round(d.pts))))
          ),
          React.createElement("button", { className: "btn-primary" }, "Recalculate"),
          React.createElement("button", { className: "btn-secondary" }, "Export JSON")
        ),
        React.createElement("div", { className: "card" },
          React.createElement("div", { className: "card-title" }, "Migration Recommendations"),
          RECS[tier].map((r, i) => React.createElement("div", { key: i, style: { padding: "5px 0", borderBottom: "1px solid #f0f2f4", fontSize: 12 } }, r))
        )
      )
    )
  );
}

function MigrateTab() {
  const [steps, setSteps] = useState(STEPS.map(() => "idle"));
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [running, setRunning] = useState(false);
  const [resultTab, setResultTab] = useState("json");

  const run = async () => {
    if (running) return;
    setRunning(true); setDone(false); setSteps(STEPS.map(() => "idle")); setProgress(0);
    for (let i = 0; i < STEPS.length; i++) {
      setSteps(s => s.map((v, j) => j === i ? "running" : v));
      setProgress(Math.round((i / STEPS.length) * 80));
      await new Promise(r => setTimeout(r, 900 + Math.random() * 400));
      setSteps(s => s.map((v, j) => j === i ? "done" : v));
    }
    setProgress(100); setDone(true); setRunning(false);
  };

  const jsonOutput = `{
  "report_id": "UW_LifeIns_Mortality_Qtly",
  "complexity": { "overall": "MEDIUM", "score": 52 },
  "visuals": [
    { "id": "V1", "source_type": "Crosstab", "target_type": "Matrix", "complexity": "HIGH" },
    { "id": "V2", "source_type": "Bar Chart", "target_type": "Clustered Bar", "complexity": "LOW" },
    { "id": "V3", "source_type": "List Report", "target_type": "Table Visual", "complexity": "LOW" },
    { "id": "V4", "source_type": "Gauge", "target_type": "KPI Card", "complexity": "MEDIUM" }
  ],
  "warnings": [
    { "code": "OSFI_B20", "severity": "high", "visual": "V1" },
    { "code": "PIPEDA_PII", "severity": "high", "visual": "V7", "field": "applicant_dob" }
  ],
  "status": "COMPLETE"
}`;

  const daxOutput = `-- LifeInsurance_Measures_Generated.dax
-- Auto-generated by Migration Accelerator v1.0.0

DEFINE

  MEASURE fact_uw_decisions[Approved Count] =
    CALCULATE(COUNTROWS(fact_uw_decisions),
      fact_uw_decisions[decision] = "Approved")

  MEASURE fact_uw_decisions[Approval Rate %] =
    DIVIDE([Approved Count], [Approved Count] + [Declined Count], 0) * 100

  MEASURE fact_mortality[AE Mortality Ratio] =
    DIVIDE(SUM(fact_mortality[actual_deaths]),
      SUM(fact_mortality[expected_deaths]), 0)

  MEASURE fact_mortality[Premium At Risk] =
    SUMX(FILTER(dim_policy, dim_policy[status] = "InForce"),
      dim_policy[annual_premium])`;

  return React.createElement("div", { className: "panel" },
    React.createElement("div", { className: "section-title" }, "Migration Pipeline"),
    React.createElement("div", { className: "section-sub" }, "Simulated pipeline: Cognos XML to IR to Rule Engine to Validator to Output"),
    React.createElement("div", { className: "card", style: { marginBottom: 16 } },
      React.createElement("div", { className: "card-title" }, "Source Report"),
      React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 16 } },
        React.createElement("div", { style: { background: "#f0f6ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: "10px 16px", fontSize: 12, color: "#1e40af", fontFamily: "monospace", flex: 1 } },
          "LifeInsurance_UW_Mortality_Report.xml - 9 visuals - 2 queries - 4 prompts"
        ),
        React.createElement("button", { className: "btn-primary", onClick: run, disabled: running }, running ? "Running..." : "Run Pipeline")
      ),
      React.createElement("div", { className: "progress-bar", style: { marginTop: 14, marginBottom: 0 } },
        React.createElement("div", { className: "progress-fill", style: { width: progress + "%" } })
      )
    ),
    React.createElement("div", { className: "card", style: { marginBottom: 16 } },
      React.createElement("div", { className: "card-title" }, "Pipeline Steps"),
      STEPS.map((step, i) => React.createElement("div", { key: i },
        React.createElement("div", { className: "step-row" },
          React.createElement("div", { className: "step-icon " + steps[i] }, steps[i] === "done" ? "v" : steps[i] === "running" ? "o" : i + 1),
          React.createElement("div", { className: "step-info" },
            React.createElement("div", { className: "step-name" }, step.name),
            React.createElement("div", { className: "step-desc" }, step.desc)
          ),
          React.createElement("div", { className: "step-status " + steps[i] }, steps[i] === "done" ? "Done" : steps[i] === "running" ? "Running..." : "Idle")
        ),
        i < STEPS.length - 1 && React.createElement("div", { className: "step-connector" + (steps[i] === "done" ? " done" : "") })
      ))
    ),
    done && React.createElement("div", null,
      React.createElement("div", { className: "card", style: { marginBottom: 16 } },
        React.createElement("div", { className: "card-title" }, "Migration Summary"),
        React.createElement("div", { className: "summary-grid" },
          React.createElement("div", { className: "stat-card" }, React.createElement("div", { className: "stat-val" }, "9"), React.createElement("div", { className: "stat-lbl" }, "Visuals Processed")),
          React.createElement("div", { className: "stat-card" }, React.createElement("div", { className: "stat-val", style: { color: "#f59e0b" } }, "Medium"), React.createElement("div", { className: "stat-lbl" }, "Overall Complexity")),
          React.createElement("div", { className: "stat-card" }, React.createElement("div", { className: "stat-val" }, "8"), React.createElement("div", { className: "stat-lbl" }, "DAX Measures")),
          React.createElement("div", { className: "stat-card" }, React.createElement("div", { className: "stat-val", style: { color: "#059669" } }, "3-5d"), React.createElement("div", { className: "stat-lbl" }, "Est. Effort"))
        ),
        React.createElement("div", { className: "warning-item" }, "OSFI B-20: Mortality ratio references regulatory threshold - manual review required."),
        React.createElement("div", { className: "warning-item" }, "PIPEDA: Applicant DOB field in Visual 7 - apply RLS before publishing.")
      ),
      React.createElement("div", { className: "card" },
        React.createElement("div", { className: "result-tabs" },
          React.createElement("button", { className: "result-tab" + (resultTab === "json" ? " active" : ""), onClick: () => setResultTab("json") }, "migration_result.json"),
          React.createElement("button", { className: "result-tab" + (resultTab === "dax" ? " active" : ""), onClick: () => setResultTab("dax") }, "Measures_Generated.dax")
        ),
        resultTab === "json"
          ? React.createElement("div", { className: "json-block" }, jsonOutput)
          : React.createElement("div", { className: "dax-block" }, daxOutput)
      )
    )
  );
}

const PBI_PAGES = ["Executive Summary", "Underwriting Performance", "Claims", "Portfolio Analysis", "Compliance / Audit"];

function PreviewTab() {
  const [page, setPage] = useState(0);
  return React.createElement("div", { className: "panel" },
    React.createElement("div", { className: "section-title" }, "Power BI Report Preview"),
    React.createElement("div", { className: "section-sub" }, "5-page migrated report - Life Insurance Underwriting and Analytics"),
    React.createElement("div", { className: "pbi-nav" },
      PBI_PAGES.map((p, i) => React.createElement("button", { key: i, className: "pbi-tab" + (page === i ? " active" : ""), onClick: () => setPage(i) }, p))
    ),
    React.createElement("div", { className: "pbi-content" },
      page === 0 && React.createElement("div", null,
        React.createElement("div", { className: "kpi-row" },
          [["In-Force Policies","42,817","3.2% up"],["Premium at Risk","$284.3M","5.1% up"],["Approval Rate","78.4%","1.2% vs target"],["A/E Mortality Ratio","91.3%","Favourable"]].map(([l,v,c]) =>
            React.createElement("div", { key: l, className: "kpi-card" },
              React.createElement("div", { className: "kpi-label" }, l),
              React.createElement("div", { className: "kpi-val" }, v),
              React.createElement("div", { className: "kpi-up", style: { fontSize: 11 } }, c)
            )
          )
        ),
        React.createElement("div", { className: "chart-wrap" },
          React.createElement("div", { className: "chart-title" }, "New Business by Product (QTD)"),
          React.createElement("div", { className: "bar-chart" },
            [["Term Life","$41M",120,"#0d6efd"],["Whole Life","$29M",86,"#0ea5e9"],["UL","$22M",66,"#38bdf8"],["CI","$14M",42,"#7dd3fc"],["Disability","$8M",24,"#bae6fd"]].map(([l,v,h,c]) =>
              React.createElement("div", { key: l, className: "bar-col" },
                React.createElement("div", { className: "bar-val" }, v),
                React.createElement("div", { className: "bar", style: { height: h, background: c } }),
                React.createElement("div", { className: "bar-lbl" }, l)
              )
            )
          )
        )
      ),
      page === 1 && React.createElement("div", null,
        React.createElement("div", { className: "kpi-row" },
          [["Cases Received","1,284","8.4% QTD"],["Avg Decision Days","4.2d","0.6d better"],["APS Request Rate","23.1%","2.1% vs target"],["MIB Hit Rate","6.8%","0.4% favourable"]].map(([l,v,c]) =>
            React.createElement("div", { key: l, className: "kpi-card" },
              React.createElement("div", { className: "kpi-label" }, l),
              React.createElement("div", { className: "kpi-val" }, v),
              React.createElement("div", { style: { fontSize: 11 } }, c)
            )
          )
        ),
        React.createElement("div", { className: "chart-wrap" },
          React.createElement("div", { className: "chart-title" }, "Table Rating Distribution"),
          [["Standard (100)",63,"#0d6efd"],["Table B (150)",14,"#0ea5e9"],["Table D (200)",9,"#38bdf8"],["Table F (250)",6,"#f59e0b"],["Table H+ (300+)",5,"#ef4444"],["Flat Extra",3,"#8b5cf6"]].map(([l,v,c]) =>
            React.createElement("div", { key: l, className: "mini-bar-row" },
              React.createElement("div", { className: "mini-bar-label" }, l),
              React.createElement("div", { className: "mini-bar-track" }, React.createElement("div", { className: "mini-bar-fill", style: { width: v + "%", background: c } })),
              React.createElement("div", { className: "mini-bar-val" }, v + "%")
            )
          )
        )
      ),
      page === 2 && React.createElement("div", null,
        React.createElement("div", { className: "kpi-row" },
          [["Claims Incurred YTD","$12.4M","3.1% vs budget"],["Avg Claim Size","$287K","4.2% up"],["Contested Claims","12","2 less vs prior yr"],["Avg Settlement Days","18.4d","2.1d better"]].map(([l,v,c]) =>
            React.createElement("div", { key: l, className: "kpi-card" },
              React.createElement("div", { className: "kpi-label" }, l),
              React.createElement("div", { className: "kpi-val" }, v),
              React.createElement("div", { style: { fontSize: 11 } }, c)
            )
          )
        ),
        React.createElement("div", { className: "chart-wrap" },
          React.createElement("div", { className: "chart-title" }, "Claims by Cause of Death (YTD)"),
          React.createElement("div", { className: "bar-chart" },
            [["Cardiac","$4.1M",132,"#ef4444"],["Cancer","$2.8M",90,"#f97316"],["Accident","$1.9M",61,"#f59e0b"],["Stroke","$1.4M",45,"#84cc16"],["Other","$2.2M",71,"#6c757d"]].map(([l,v,h,c]) =>
              React.createElement("div", { key: l, className: "bar-col" },
                React.createElement("div", { className: "bar-val" }, v),
                React.createElement("div", { className: "bar", style: { height: h, background: c } }),
                React.createElement("div", { className: "bar-lbl" }, l)
              )
            )
          )
        )
      ),
      page === 3 && React.createElement("div", null,
        React.createElement("div", { className: "kpi-row" },
          [["Total Coverage","$8.7B","6.2% up"],["Lapse Rate QTD","2.1%","0.3% favourable"],["Avg Policy Age","7.4 yrs","stable"],["Reinsurance Ceded","$1.2B","14% of total"]].map(([l,v,c]) =>
            React.createElement("div", { key: l, className: "kpi-card" },
              React.createElement("div", { className: "kpi-label" }, l),
              React.createElement("div", { className: "kpi-val" }, v),
              React.createElement("div", { style: { fontSize: 11 } }, c)
            )
          )
        ),
        React.createElement("div", { className: "chart-wrap" },
          React.createElement("div", { className: "chart-title" }, "Portfolio by Age Band"),
          React.createElement("div", { className: "bar-chart" },
            [["18-34",18,58],["35-44",27,87],["45-54",31,100],["55-64",18,58],["65+",6,19]].map(([l,v,h]) =>
              React.createElement("div", { key: l, className: "bar-col" },
                React.createElement("div", { className: "bar-val" }, v + "%"),
                React.createElement("div", { className: "bar", style: { height: h, background: "#0d6efd" } }),
                React.createElement("div", { className: "bar-lbl" }, l)
              )
            )
          )
        )
      ),
      page === 4 && React.createElement("div", null,
        React.createElement("div", { className: "kpi-row" },
          [["OSFI B-20 Flags","3","Open - review required","#ef4444"],["PIPEDA Reviews","7","2 pending closure","#f59e0b"],["RLS Policies Active","14","All validated","#059669"],["Audit Log Entries","2,841","Last 30 days","#1a1d23"]].map(([l,v,c,col]) =>
            React.createElement("div", { key: l, className: "kpi-card" },
              React.createElement("div", { className: "kpi-label" }, l),
              React.createElement("div", { className: "kpi-val", style: { color: col } }, v),
              React.createElement("div", { style: { fontSize: 11 } }, c)
            )
          )
        ),
        React.createElement("div", { className: "chart-wrap" },
          React.createElement("div", { className: "chart-title" }, "Compliance Items"),
          React.createElement("table", null,
            React.createElement("thead", null, React.createElement("tr", null, ["Item","Regulation","Severity","Status"].map(h => React.createElement("th", { key: h }, h)))),
            React.createElement("tbody", null,
              [["Mortality ratio threshold","OSFI B-20","High","In Review"],["Applicant DOB exposure","PIPEDA","High","Remediation"],["MIB data retention","PIPEDA","Medium","Scheduled"],["Reinsurance cession docs","OSFI E-18","Medium","Closed"]].map(([item,reg,sev,stat]) =>
                React.createElement("tr", { key: item },
                  React.createElement("td", null, item),
                  React.createElement("td", null, reg),
                  React.createElement("td", null, React.createElement("span", { className: "pill " + (sev === "High" ? "pill-red" : "pill-yellow") }, sev)),
                  React.createElement("td", null, React.createElement("span", { className: "pill " + (stat === "Closed" ? "pill-green" : stat === "Scheduled" ? "pill-blue" : "pill-yellow") }, stat))
                )
              )
            )
          )
        )
      )
    )
  );
}

export default function CognosDemo() {
  const [tab, setTab] = useState("score");
  return React.createElement("div", { className: "cognos-demo-root" },
    React.createElement("style", null, styles),
    React.createElement("div", { className: "top-nav" },
      React.createElement("div", { className: "nav-brand" }, "Migration Accelerator - Cognos to Power BI"),
      [["score","Score"],["migrate","Migrate"],["preview","Preview"]].map(([id,label]) =>
        React.createElement("button", { key: id, className: "tab-btn" + (tab === id ? " active" : ""), onClick: () => setTab(id) }, label)
      ),
      React.createElement("a", { href: "/scorer", className: "tab-btn", style: { textDecoration: "none", marginLeft: "auto" } }, "📊 Advanced Scorer")
    ),
    tab === "score" && React.createElement(ScoreTab, null),
    tab === "migrate" && React.createElement(MigrateTab, null),
    tab === "preview" && React.createElement(PreviewTab, null)
  );
}
