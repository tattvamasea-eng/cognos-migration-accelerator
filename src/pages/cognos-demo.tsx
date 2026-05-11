import React, { useState, useRef, useEffect } from "react";

/* ─── Types ─── */
type WizardStep = "upload" | "extract" | "score" | "migrate" | "preview";

interface ReportData {
  reportName: string;
  author: string;
  dataSource: string;
  createdDate: string;
  visuals: Array<{ id: string; type: string; subtype: string; title: string; query: string }>;
  queries: Array<{ name: string; itemCount: number; calcItems: number; detailFilters: number }>;
  filters: Array<{ name: string; type: string; params: string[] }>;
  prompts: Array<{ name: string; type: string; required: boolean }>;
  dataSources: Array<{ name: string; subjects: Array<{ name: string; itemCount: number }> }>;
}

/* ─── Demo data: parsed from mock_cognos_report.xml ─── */
const DEMO_REPORT: ReportData = {
  reportName: "Life_Insurance_Underwriting_Summary",
  author: "UW Analytics Team",
  dataSource: "UW_DW_PROD",
  createdDate: "2023-06-01",
  visuals: [
    { id: "TotalPoliciesKPI", type: "KPI Card", subtype: "kpi", title: "Total Policies Issued", query: "MainQuery" },
    { id: "TotalFaceAmountKPI", type: "KPI Card", subtype: "kpi", title: "Total Face Amount", query: "MainQuery" },
    { id: "STPRateKPI", type: "KPI Card", subtype: "kpi", title: "STP Rate", query: "MainQuery" },
    { id: "AvgPremiumKPI", type: "KPI Card", subtype: "kpi", title: "Average Annual Premium", query: "MainQuery" },
    { id: "DecisionBreakdownChart", type: "Bar Chart", subtype: "bar", title: "Underwriting Decisions Distribution", query: "MainQuery" },
    { id: "MonthlyVolumeTrend", type: "Line Chart", subtype: "line", title: "Monthly Policy Volume and Face Amount Trend", query: "MainQuery" },
    { id: "ProvinceRatingCrosstab", type: "Crosstab", subtype: "matrix", title: "Policy Distribution by Province and Rating Class", query: "MainQuery" },
    { id: "SmokerDistributionChart", type: "Pie Chart", subtype: "pie", title: "Smoker vs Non-Smoker Distribution", query: "MainQuery" },
    { id: "TopPoliciesList", type: "List", subtype: "table", title: "Policy Detail", query: "MainQuery" },
  ],
  queries: [
    { name: "MainQuery", itemCount: 20, calcItems: 2, detailFilters: 2 },
    { name: "ProvinceBreakdown", itemCount: 4, calcItems: 0, detailFilters: 0 },
  ],
  filters: [
    { name: "DateRangeFilter", type: "dateRange", params: ["StartDate", "EndDate"] },
    { name: "DecisionFilter", type: "multiSelect", params: ["DecisionType"] },
    { name: "ProvinceFilter", type: "multiSelect", params: ["ProvinceCode"] },
  ],
  prompts: [
    { name: "StartDate", type: "date", required: true },
    { name: "EndDate", type: "date", required: true },
    { name: "DecisionType", type: "multiSelect", required: false },
    { name: "ProvinceCode", type: "multiSelect", required: false },
  ],
  dataSources: [
    {
      name: "UW_DW_PROD",
      subjects: [
        { name: "POLICY_FACT", itemCount: 10 },
        { name: "APPLICANT_DIM", itemCount: 7 },
        { name: "MIB_CHECK_DIM", itemCount: 3 },
      ],
    },
  ],
};

/* ─── Score inputs derived from extraction ─── */
const DEMO_SCORE_INPUTS = {
  reportName: "Life_Insurance_Underwriting_Summary",
  numVisuals: 9,
  numQueries: 2,
  numFilters: 3,
  numCalcs: 5,
  visType: "cross" as const,
  calcType: "medium" as const,
  filterType: "dynamic" as const,
  risks: [8, 7, 11] as number[],
};

/* ─── Weights & scoring ─── */
const WEIGHTS = {
  visType: { basic: 5, cross: 18, custom: 28, geo: 22 },
  calcType: { simple: 5, medium: 14, complex: 26 },
  filterType: { static: 4, dynamic: 12, parameterized: 18 },
};

const RECS = {
  LOW: [
    "Straightforward migration — automate with standard rule set",
    "Use Power BI Desktop import mode for all queries",
    "Estimated 1-2 sprints to complete",
    "Unit-test each visual mapping before handoff",
  ],
  MEDIUM: [
    "Assign a Power BI SME for DAX measure validation",
    "Manually validate all drill-through paths post-migration",
    "Matrix visuals require layout review in Power BI service",
    "Schedule OSFI/PIPEDA compliance review before publish",
  ],
  HIGH: [
    "Requires senior BI architect — do not automate without review",
    "Custom visuals may need AppSource replacements or custom dev",
    "Row-level security must be re-implemented and UAT tested",
    "Allocate 2-3 sprints minimum; include QA and sign-off phases",
  ],
};

const RISK_FLAGS = [
  { label: "Report Bursting", val: 12 },
  { label: "Complex Layout", val: 8 },
  { label: "Multi-language", val: 10 },
  { label: "Drill-through", val: 7 },
  { label: "Row-level Security", val: 9 },
  { label: "OSFI / PIPEDA flags", val: 11 },
];

function calcScore(state: any) {
  const v = state.numVisuals * 1 || 0;
  const q = state.numQueries * 1 || 0;
  const f = state.numFilters * 1 || 0;
  const vt = WEIGHTS.visType[state.visType] || 0;
  const ct = WEIGHTS.calcType[state.calcType] || 0;
  const ft = WEIGHTS.filterType[state.filterType] || 0;
  const riskPts = state.risks.reduce((a: number, r: number) => a + r, 0);
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

/* ═══════════════════════════════════════════════════════════════════ */
/*  STEP 1: UPLOAD                                                    */
/* ═══════════════════════════════════════════════════════════════════ */

function UploadStep({ onDemo, onUpload }: { onDemo: () => void; onUpload: (data: ReportData) => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    const text = await file.text();
    // Simple client-side XML parse simulation
    const parser = new DOMParser();
    const xml = parser.parseFromString(text, "text/xml");
    const reportName = xml.documentElement.getAttribute("name") || file.name.replace(/\.xml$/i, "");
    const visuals = Array.from(xml.querySelectorAll("chart, crosstab, list, textItem")).map((el, i) => ({
      id: el.getAttribute("name") || `V${i + 1}`,
      type: el.tagName === "chart" ? "Chart" : el.tagName === "crosstab" ? "Crosstab" : el.tagName === "list" ? "List" : "KPI Card",
      subtype: el.querySelector("type")?.textContent || "",
      title: el.querySelector("title")?.textContent || "",
      query: el.querySelector("query")?.textContent || "",
    }));
    const queries = Array.from(xml.querySelectorAll("query")).map((q) => ({
      name: q.getAttribute("name") || "",
      itemCount: q.querySelectorAll("dataItem").length,
      calcItems: Array.from(q.querySelectorAll("dataItem")).filter((d) => d.getAttribute("aggregate") === "calculated").length,
      detailFilters: q.querySelectorAll("detailFilter").length,
    }));
    const filters = Array.from(xml.querySelectorAll("parameterFilter")).map((f) => ({
      name: f.getAttribute("name") || "",
      type: f.querySelector("type")?.textContent || "",
      params: Array.from(f.querySelectorAll("parameter")).map((p) => p.textContent || ""),
    }));
    const prompts = Array.from(xml.querySelectorAll("prompt")).map((p) => ({
      name: p.getAttribute("name") || "",
      type: p.getAttribute("type") || "",
      required: p.getAttribute("required") === "true",
    }));

    onUpload({ reportName, author: "", dataSource: "", createdDate: "", visuals, queries, filters, prompts, dataSources: [] });
  };

  return (
    <div className="panel">
      <div className="section-title" style={{ textAlign: "center", fontSize: 28, marginBottom: 8 }}>Cognos → Power BI Migration Accelerator</div>
      <div className="section-sub" style={{ textAlign: "center", fontSize: 15, marginBottom: 40 }}>Upload a Cognos report XML to analyse migration complexity and generate Power BI artefacts</div>

      <div style={{ maxWidth: 560, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Upload zone */}
        <div
          className="card"
          style={{ border: "2px dashed #d0d5dd", borderRadius: 14, padding: 40, textAlign: "center", cursor: "pointer", transition: "all 0.2s" }}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
        >
          <div style={{ fontSize: 40, marginBottom: 12 }}>📁</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>Drop a Cognos XML report here</div>
          <div style={{ fontSize: 13, color: "#6c757d" }}>or click to browse (.xml files)</div>
          <input ref={fileInputRef} type="file" accept=".xml" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
        </div>

        {/* Divider */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1, height: 1, background: "#e2e5ea" }} />
          <span style={{ fontSize: 12, color: "#6c757d", fontWeight: 500 }}>OR</span>
          <div style={{ flex: 1, height: 1, background: "#e2e5ea" }} />
        </div>

        {/* Demo data */}
        <button className="btn-primary" style={{ width: "100%", padding: 16, fontSize: 15 }} onClick={onDemo}>
          ▶ Run with Demo Report — "Life Insurance Underwriting Summary"
        </button>

        <div style={{ background: "#f8f9fb", borderRadius: 10, padding: 16, fontSize: 12, color: "#495057", lineHeight: 1.7 }}>
          <strong>Demo report includes:</strong> 9 visuals (4 KPIs, 2 charts, 1 crosstab, 1 pie, 1 list) · 2 queries · 3 filters · 4 prompts · 3 data sources (20 fields)
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  STEP 2: EXTRACT                                                   */
/* ═══════════════════════════════════════════════════════════════════ */

function ExtractStep({ data, onNext }: { data: ReportData; onNext: () => void }) {
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState("Reading XML structure...");
  const [done, setDone] = useState(false);

  useEffect(() => {
    const stages = [
      { t: 800, p: 15, s: "Parsing metadata..." },
      { t: 1600, p: 30, s: "Discovering data sources..." },
      { t: 2400, p: 45, s: "Analysing queries..." },
      { t: 3200, p: 60, s: "Identifying visuals..." },
      { t: 4000, p: 75, s: "Extracting filters & prompts..." },
      { t: 4800, p: 90, s: "Building intermediate representation..." },
      { t: 5600, p: 100, s: "Extraction complete" },
    ];
    const timers = stages.map(({ t, p, s }) =>
      setTimeout(() => { setProgress(p); setStage(s); if (p === 100) setTimeout(() => setDone(true), 400); }, t)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  const visCounts: Record<string, number> = {};
  data.visuals.forEach((v) => { visCounts[v.type] = (visCounts[v.type] || 0) + 1; });

  return (
    <div className="panel">
      <div className="section-title">Extraction Engine</div>
      <div className="section-sub">Analysing {data.reportName} — {data.visuals.length} visuals discovered</div>

      {/* Progress */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{stage}</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#0d6efd" }}>{progress}%</div>
        </div>
        <div className="progress-bar"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
      </div>

      {done && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            {/* Report metadata */}
            <div className="card">
              <div className="card-title">Report Metadata</div>
              <div style={{ fontSize: 13, lineHeight: 2 }}>
                <div><strong>Name:</strong> {data.reportName}</div>
                {data.author && <div><strong>Author:</strong> {data.author}</div>}
                {data.dataSource && <div><strong>Data Source:</strong> {data.dataSource}</div>}
                {data.createdDate && <div><strong>Created:</strong> {data.createdDate}</div>}
              </div>
            </div>

            {/* Data sources */}
            <div className="card">
              <div className="card-title">Data Sources ({data.dataSources.length})</div>
              {data.dataSources.map((ds) => (
                <div key={ds.name} style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{ds.name}</div>
                  {ds.subjects.map((s) => (
                    <div key={s.name} style={{ fontSize: 12, color: "#6c757d", paddingLeft: 8 }}>• {s.name} — {s.itemCount} fields</div>
                  ))}
                </div>
              ))}
            </div>

            {/* Visuals */}
            <div className="card">
              <div className="card-title">Visuals ({data.visuals.length})</div>
              {data.visuals.map((v) => (
                <div key={v.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: "1px solid #f0f2f4", fontSize: 12 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: v.type === "KPI Card" ? "#22c55e" : v.type === "Crosstab" ? "#f59e0b" : "#0d6efd", flexShrink: 0 }} />
                  <span style={{ flex: 1 }}><strong>{v.type}</strong> — {v.title}</span>
                  <span style={{ color: "#6c757d", fontSize: 11 }}>{v.query}</span>
                </div>
              ))}
              <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                {Object.entries(visCounts).map(([type, count]) => (
                  <span key={type} style={{ fontSize: 11, padding: "3px 10px", background: "#f0f6ff", borderRadius: 12, color: "#0d6efd", fontWeight: 600 }}>{count}× {type}</span>
                ))}
              </div>
            </div>

            {/* Queries */}
            <div className="card">
              <div className="card-title">Queries ({data.queries.length})</div>
              {data.queries.map((q) => (
                <div key={q.name} style={{ padding: "8px 0", borderBottom: "1px solid #f0f2f4", fontSize: 12 }}>
                  <div style={{ fontWeight: 600 }}>{q.name}</div>
                  <div style={{ color: "#6c757d", marginTop: 2 }}>{q.itemCount} data items · {q.calcItems} calculated · {q.detailFilters} detail filters</div>
                </div>
              ))}
            </div>

            {/* Filters */}
            <div className="card">
              <div className="card-title">Page Filters ({data.filters.length})</div>
              {data.filters.map((f) => (
                <div key={f.name} style={{ padding: "6px 0", borderBottom: "1px solid #f0f2f4", fontSize: 12 }}>
                  <span style={{ fontWeight: 600 }}>{f.name}</span> — <span style={{ color: "#6c757d" }}>{f.type}</span>
                  <div style={{ color: "#6c757d", fontSize: 11, marginTop: 1 }}>Params: {f.params.join(", ")}</div>
                </div>
              ))}
            </div>

            {/* Prompts */}
            <div className="card">
              <div className="card-title">Prompts ({data.prompts.length})</div>
              {data.prompts.map((p) => (
                <div key={p.name} style={{ padding: "6px 0", borderBottom: "1px solid #f0f2f4", fontSize: 12 }}>
                  <span style={{ fontWeight: 600 }}>{p.name}</span> — <span style={{ color: "#6c757d" }}>{p.type}</span>
                  {p.required && <span className="pill pill-red" style={{ marginLeft: 6 }}>Required</span>}
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "center" }}>
            <button className="btn-primary" style={{ padding: "12px 32px", fontSize: 14 }} onClick={onNext}>Continue to Complexity Score →</button>
          </div>
        </>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  STEP 3: SCORE                                                     */
/* ═══════════════════════════════════════════════════════════════════ */

function ScoreStep({ reportData, initialInputs, onNext }: { reportData: ReportData; initialInputs: typeof DEMO_SCORE_INPUTS; onNext: () => void }) {
  const [form, setForm] = useState({
    reportName: initialInputs.reportName,
    numVisuals: initialInputs.numVisuals,
    numQueries: initialInputs.numQueries,
    numFilters: initialInputs.numFilters,
    numCalcs: initialInputs.numCalcs,
    visType: initialInputs.visType,
    calcType: initialInputs.calcType,
    filterType: initialInputs.filterType,
  });
  const [risks, setRisks] = useState<number[]>(initialInputs.risks);
  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));
  const toggleRisk = (val: number) => setRisks((r) => (r.includes(val) ? r.filter((x) => x !== val) : [...r, val]));
  const { total, tier, drivers, effort } = calcScore({ ...form, risks });
  const badgeClass = tier === "LOW" ? "badge-low" : tier === "MEDIUM" ? "badge-medium" : "badge-high";
  const numClass = tier === "LOW" ? "score-low" : tier === "MEDIUM" ? "score-med" : "score-high";

  return (
    <div className="panel">
      <div className="section-title">Complexity Scorer</div>
      <div className="section-sub">Evaluate <strong>{reportData.reportName}</strong> and estimate migration effort to Power BI</div>

      <div className="score-grid">
        <div className="card">
          <div className="card-title">Report Profile</div>
          <label>Report Name</label>
          <input value={form.reportName} onChange={(e) => set("reportName", e.target.value)} />
          <label>Number of Visuals</label>
          <input type="number" value={form.numVisuals} onChange={(e) => set("numVisuals", e.target.value)} />
          <label>Number of Queries</label>
          <input type="number" value={form.numQueries} onChange={(e) => set("numQueries", e.target.value)} />
          <label>Number of Calculated Items</label>
          <input type="number" value={form.numCalcs} onChange={(e) => set("numCalcs", e.target.value)} />
        </div>
        <div className="card">
          <div className="card-title">Visual & Calc Complexity</div>
          <label>Visual Type Mix</label>
          <select value={form.visType} onChange={(e) => set("visType", e.target.value)}>
            <option value="basic">Basic charts (bar, line, pie)</option>
            <option value="cross">Crosstabs / Matrixes</option>
            <option value="custom">Custom visualizations</option>
            <option value="geo">Geo / Maps</option>
          </select>
          <label>Calculation Complexity</label>
          <select value={form.calcType} onChange={(e) => set("calcType", e.target.value)}>
            <option value="simple">Simple (sums, counts)</option>
            <option value="medium">Medium (ratios, % change)</option>
            <option value="complex">Complex (actuarial, nested)</option>
          </select>
        </div>
      </div>

      <div className="score-grid">
        <div className="card">
          <div className="card-title">Filters</div>
          <label>Number of Prompt Filters</label>
          <input type="number" value={form.numFilters} onChange={(e) => set("numFilters", e.target.value)} />
          <label>Filter Type</label>
          <select value={form.filterType} onChange={(e) => set("filterType", e.target.value)}>
            <option value="static">Static filters only</option>
            <option value="dynamic">Dynamic / cascading</option>
            <option value="parameterized">Fully parameterized</option>
          </select>
        </div>
        <div className="card">
          <div className="card-title">Risk Flags</div>
          <div className="risk-flags">
            {RISK_FLAGS.map((r) => (
              <div key={r.val} className={`risk-flag${risks.includes(r.val) ? " selected" : ""}`} onClick={() => toggleRisk(r.val)}>
                {r.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="score-grid">
        <div className="score-result">
          <div className={`score-badge ${badgeClass}`}>{tier} COMPLEXITY</div>
          <div className={`score-number ${numClass}`}>{total}</div>
          <div className="score-effort">Estimated effort: {effort}</div>
          <div style={{ textAlign: "left", marginTop: 12 }}>
            <div className="card-title">Score Drivers</div>
            {drivers.map((d) => (
              <div key={d.name} className="driver-item">
                <span>{d.name}</span>
                <span style={{ fontWeight: 600 }}>+{Math.round(d.pts)}</span>
              </div>
            ))}
          </div>
          <button className="btn-primary" style={{ marginRight: 8 }} onClick={onNext}>Run Migration Pipeline →</button>
          <button className="btn-secondary">Export JSON</button>
        </div>
        <div className="card">
          <div className="card-title">Migration Recommendations</div>
          {RECS[tier as keyof typeof RECS].map((r, i) => (
            <div key={i} style={{ padding: "5px 0", borderBottom: "1px solid #f0f2f4", fontSize: 12 }}>{r}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  STEP 4: MIGRATE                                                   */
/* ═══════════════════════════════════════════════════════════════════ */

const STEPS = [
  { name: "XML Extractor", desc: "Parse Cognos report spec, extract visuals, queries, filters" },
  { name: "IR Generator", desc: "Convert to intermediate representation (schema-agnostic)" },
  { name: "Rule Engine", desc: "Apply mapping rules: Cognos to Power BI visual types + DAX patterns" },
  { name: "Complexity Scorer", desc: "Score each visual, compute aggregate effort estimate" },
  { name: "Validator", desc: "Check DAX syntax, OSFI/PIPEDA flags, referential integrity" },
];

function MigrateStep({ onNext }: { onNext: () => void }) {
  const [steps, setSteps] = useState(STEPS.map(() => "idle"));
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [running, setRunning] = useState(false);
  const [resultTab, setResultTab] = useState("json");

  const run = async () => {
    if (running) return;
    setRunning(true); setDone(false); setSteps(STEPS.map(() => "idle")); setProgress(0);
    for (let i = 0; i < STEPS.length; i++) {
      setSteps((s) => s.map((v, j) => (j === i ? "running" : v)));
      setProgress(Math.round((i / STEPS.length) * 80));
      await new Promise((r) => setTimeout(r, 900 + Math.random() * 400));
      setSteps((s) => s.map((v, j) => (j === i ? "done" : v)));
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

  return (
    <div className="panel">
      <div className="section-title">Migration Pipeline</div>
      <div className="section-sub">Simulated pipeline: Cognos XML → IR → Rule Engine → Validator → Output</div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title">Pipeline Execution</div>
        {!done && !running && (
          <button className="btn-primary" onClick={run}>▶ Run Pipeline</button>
        )}
        {(running || done) && (
          <>
            <div className="progress-bar"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
            {STEPS.map((step, i) => (
              <React.Fragment key={step.name}>
                <div className="step-row">
                  <div className={`step-icon ${steps[i]}`}>{steps[i] === "done" ? "✓" : steps[i] === "running" ? "◐" : "○"}</div>
                  <div className="step-info"><div className="step-name">{step.name}</div><div className="step-desc">{step.desc}</div></div>
                  <div className={`step-status ${steps[i]}`}>{steps[i] === "done" ? "Done" : steps[i] === "running" ? "Running..." : "Idle"}</div>
                </div>
                {i < STEPS.length - 1 && <div className={`step-connector ${steps[i] === "done" ? "done" : ""}`} />}
              </React.Fragment>
            ))}
          </>
        )}
      </div>

      {done && (
        <>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-title">Migration Summary</div>
            <div className="summary-grid">
              <div className="stat-card"><div className="stat-val">9</div><div className="stat-lbl">Visuals Processed</div></div>
              <div className="stat-card"><div className="stat-val" style={{ color: "#f59e0b" }}>Medium</div><div className="stat-lbl">Overall Complexity</div></div>
              <div className="stat-card"><div className="stat-val">8</div><div className="stat-lbl">DAX Measures</div></div>
              <div className="stat-card"><div className="stat-val" style={{ color: "#059669" }}>3-5d</div><div className="stat-lbl">Est. Effort</div></div>
            </div>
            <div className="warning-item">OSFI B-20: Mortality ratio references regulatory threshold — manual review required.</div>
            <div className="warning-item">PIPEDA: Applicant DOB field in Visual 7 — apply RLS before publishing.</div>
          </div>

          <div className="card">
            <div className="result-tabs">
              <button className={`result-tab${resultTab === "json" ? " active" : ""}`} onClick={() => setResultTab("json")}>migration_result.json</button>
              <button className={`result-tab${resultTab === "dax" ? " active" : ""}`} onClick={() => setResultTab("dax")}>Measures_Generated.dax</button>
            </div>
            {resultTab === "json" ? <div className="json-block">{jsonOutput}</div> : <div className="dax-block">{daxOutput}</div>}
          </div>

          <div style={{ display: "flex", justifyContent: "center", marginTop: 16 }}>
            <button className="btn-primary" onClick={onNext}>Preview Power BI Report →</button>
          </div>
        </>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  STEP 5: PREVIEW                                                   */
/* ═══════════════════════════════════════════════════════════════════ */

const PBI_PAGES = ["Executive Summary", "Underwriting Performance", "Claims", "Portfolio Analysis", "Compliance / Audit"];

function PreviewStep() {
  const [page, setPage] = useState(0);
  return (
    <div className="panel">
      <div className="section-title">Power BI Report Preview</div>
      <div className="section-sub">5-page migrated report — Life Insurance Underwriting and Analytics</div>
      <div className="pbi-nav">
        {PBI_PAGES.map((p, i) => (
          <button key={i} className={`pbi-tab${page === i ? " active" : ""}`} onClick={() => setPage(i)}>{p}</button>
        ))}
      </div>
      <div className="pbi-content">
        {page === 0 && (
          <div>
            <div className="kpi-row">
              {[["In-Force Policies","42,817","3.2% up"],["Premium at Risk","$284.3M","5.1% up"],["Approval Rate","78.4%","1.2% vs target"],["A/E Mortality Ratio","91.3%","Favourable"]].map(([l,v,c]) => (
                <div key={l} className="kpi-card"><div className="kpi-label">{l}</div><div className="kpi-val">{v}</div><div className="kpi-up" style={{ fontSize: 11 }}>{c}</div></div>
              ))}
            </div>
            <div className="chart-wrap">
              <div className="chart-title">New Business by Product (QTD)</div>
              <div className="bar-chart">
                {[["Term Life","$41M",120,"#0d6efd"],["Whole Life","$29M",86,"#0ea5e9"],["UL","$22M",66,"#38bdf8"],["CI","$14M",42,"#7dd3fc"],["Disability","$8M",24,"#bae6fd"]].map(([l,v,h,c]) => (
                  <div key={l} className="bar-col"><div className="bar-val">{v}</div><div className="bar" style={{ height: h, background: c }} /><div className="bar-lbl">{l}</div></div>
                ))}
              </div>
            </div>
          </div>
        )}
        {page === 1 && (
          <div>
            <div className="kpi-row">
              {[["Cases Received","1,284","8.4% QTD"],["Avg Decision Days","4.2d","0.6d better"],["APS Request Rate","23.1%","2.1% vs target"],["MIB Hit Rate","6.8%","0.4% favourable"]].map(([l,v,c]) => (
                <div key={l} className="kpi-card"><div className="kpi-label">{l}</div><div className="kpi-val">{v}</div><div style={{ fontSize: 11 }}>{c}</div></div>
              ))}
            </div>
            <div className="chart-wrap">
              <div className="chart-title">Table Rating Distribution</div>
              {[["Standard (100)",63,"#0d6efd"],["Table B (150)",14,"#0ea5e9"],["Table D (200)",9,"#38bdf8"],["Table F (250)",6,"#f59e0b"],["Table H+ (300+)",5,"#ef4444"],["Flat Extra",3,"#8b5cf6"]].map(([l,v,c]) => (
                <div key={l} className="mini-bar-row"><div className="mini-bar-label">{l}</div><div className="mini-bar-track"><div className="mini-bar-fill" style={{ width: v + "%", background: c }} /></div><div className="mini-bar-val">{v}%</div></div>
              ))}
            </div>
          </div>
        )}
        {page === 2 && (
          <div>
            <div className="kpi-row">
              {[["Claims Incurred YTD","$12.4M","3.1% vs budget"],["Avg Claim Size","$287K","4.2% up"],["Contested Claims","12","2 less vs prior yr"],["Avg Settlement Days","18.4d","2.1d better"]].map(([l,v,c]) => (
                <div key={l} className="kpi-card"><div className="kpi-label">{l}</div><div className="kpi-val">{v}</div><div style={{ fontSize: 11 }}>{c}</div></div>
              ))}
            </div>
            <div className="chart-wrap">
              <div className="chart-title">Claims by Cause of Death (YTD)</div>
              <div className="bar-chart">
                {[["Cardiac","$4.1M",132,"#ef4444"],["Cancer","$2.8M",90,"#f97316"],["Accident","$1.9M",61,"#f59e0b"],["Stroke","$1.4M",45,"#84cc16"],["Other","$2.2M",71,"#6c757d"]].map(([l,v,h,c]) => (
                  <div key={l} className="bar-col"><div className="bar-val">{v}</div><div className="bar" style={{ height: h, background: c }} /><div className="bar-lbl">{l}</div></div>
                ))}
              </div>
            </div>
          </div>
        )}
        {page === 3 && (
          <div>
            <div className="kpi-row">
              {[["Total Coverage","$8.7B","6.2% up"],["Lapse Rate QTD","2.1%","0.3% favourable"],["Avg Policy Age","7.4 yrs","stable"],["Reinsurance Ceded","$1.2B","14% of total"]].map(([l,v,c]) => (
                <div key={l} className="kpi-card"><div className="kpi-label">{l}</div><div className="kpi-val">{v}</div><div style={{ fontSize: 11 }}>{c}</div></div>
              ))}
            </div>
            <div className="chart-wrap">
              <div className="chart-title">Portfolio by Age Band</div>
              <div className="bar-chart">
                {[["18-34",18,58],["35-44",27,87],["45-54",31,100],["55-64",18,58],["65+",6,19]].map(([l,v,h]) => (
                  <div key={l} className="bar-col"><div className="bar-val">{v}%</div><div className="bar" style={{ height: h, background: "#0d6efd" }} /><div className="bar-lbl">{l}</div></div>
                ))}
              </div>
            </div>
          </div>
        )}
        {page === 4 && (
          <div>
            <div className="kpi-row">
              {[["OSFI B-20 Flags","3","Open - review required","#ef4444"],["PIPEDA Reviews","7","2 pending closure","#f59e0b"],["RLS Policies Active","14","All validated","#059669"],["Audit Log Entries","2,841","Last 30 days","#1a1d23"]].map(([l,v,c,col]) => (
                <div key={l} className="kpi-card"><div className="kpi-label">{l}</div><div className="kpi-val" style={{ color: col }}>{v}</div><div style={{ fontSize: 11 }}>{c}</div></div>
              ))}
            </div>
            <div className="chart-wrap">
              <div className="chart-title">Compliance Items</div>
              <table>
                <thead><tr>{["Item","Regulation","Severity","Status"].map((h) => (<th key={h}>{h}</th>))}</tr></thead>
                <tbody>
                  {[["Mortality ratio threshold","OSFI B-20","High","In Review"],["Applicant DOB exposure","PIPEDA","High","Remediation"],["MIB data retention","PIPEDA","Medium","Scheduled"],["Reinsurance cession docs","OSFI E-18","Medium","Closed"]].map(([item,reg,sev,stat]) => (
                    <tr key={item}><td>{item}</td><td>{reg}</td><td><span className={`pill ${sev === "High" ? "pill-red" : "pill-yellow"}`}>{sev}</span></td><td><span className={`pill ${stat === "Closed" ? "pill-green" : stat === "Scheduled" ? "pill-blue" : "pill-yellow"}`}>{stat}</span></td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  WIZARD NAV                                                        */
/* ═══════════════════════════════════════════════════════════════════ */

const WIZARD_STEPS: { key: WizardStep; label: string }[] = [
  { key: "upload", label: "Upload" },
  { key: "extract", label: "Extract" },
  { key: "score", label: "Score" },
  { key: "migrate", label: "Migrate" },
  { key: "preview", label: "Preview" },
];

/* ═══════════════════════════════════════════════════════════════════ */
/*  MAIN APP                                                          */
/* ═══════════════════════════════════════════════════════════════════ */

export default function CognosDemo() {
  const [step, setStep] = useState<WizardStep>("upload");
  const [reportData, setReportData] = useState<ReportData>(DEMO_REPORT);
  const [scoreInputs, setScoreInputs] = useState(DEMO_SCORE_INPUTS);

  const goTo = (s: WizardStep) => setStep(s);

  const handleDemo = () => {
    setReportData(DEMO_REPORT);
    setScoreInputs(DEMO_SCORE_INPUTS);
    setStep("extract");
  };

  const handleUpload = (data: ReportData) => {
    setReportData(data);
    // Derive score inputs from uploaded data
    const hasCrosstab = data.visuals.some((v) => v.type === "Crosstab");
    const hasCustom = data.visuals.some((v) => v.type === "Custom");
    const calcCount = data.queries.reduce((a, q) => a + q.calcItems, 0);
    const hasParameterized = data.filters.some((f) => f.type === "parameterized");
    setScoreInputs({
      reportName: data.reportName,
      numVisuals: data.visuals.length,
      numQueries: data.queries.length,
      numFilters: data.filters.length,
      numCalcs: calcCount,
      visType: hasCustom ? "custom" : hasCrosstab ? "cross" : "basic",
      calcType: calcCount > 3 ? "complex" : calcCount > 0 ? "medium" : "simple",
      filterType: hasParameterized ? "parameterized" : data.filters.length > 1 ? "dynamic" : "static",
      risks: [],
    });
    setStep("extract");
  };

  const stepIndex = WIZARD_STEPS.findIndex((s) => s.key === step);

  return (
    <div className="cognos-demo-root">
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .cognos-demo-root { font-family: 'Segoe UI', system-ui, sans-serif; background: #f8f9fb; color: #1a1d23; min-height: 100vh; }
        .top-nav { background: #fff; border-bottom: 1px solid #e2e5ea; display: flex; align-items: center; padding: 0 24px; height: 56px; position: sticky; top: 0; z-index: 100; }
        .nav-brand { font-size: 13px; font-weight: 600; color: #0d6efd; margin-right: 32px; display: flex; align-items: center; gap: 8px; white-space: nowrap; }
        .nav-brand span { color: #6c757d; font-weight: 400; }
        .tab-btn { height: 56px; padding: 0 20px; border: none; background: none; cursor: pointer; font-size: 13px; font-weight: 500; color: #6c757d; border-bottom: 2px solid transparent; display: flex; align-items: center; gap: 7px; white-space: nowrap; text-decoration: none; }
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
        .wizard-bar { display: flex; align-items: center; justify-content: center; gap: 4px; padding: 16px 24px; background: #fff; border-bottom: 1px solid #e2e5ea; }
        .wizard-step { display: flex; align-items: center; gap: 8px; padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 600; cursor: default; }
        .wizard-step-done { background: #d1fae5; color: #065f46; }
        .wizard-step-active { background: #dbeafe; color: #1d4ed8; }
        .wizard-step-todo { background: #f8f9fb; color: #adb5bd; }
        .wizard-arrow { color: #d0d5dd; font-size: 12px; }
      `}</style>

      {/* Top nav */}
      <div className="top-nav">
        <div className="nav-brand">Migration Accelerator <span>— Cognos to Power BI</span></div>
        <a href="/scorer" className="tab-btn" style={{ marginLeft: "auto" }}>📊 Advanced Scorer</a>
      </div>

      {/* Wizard progress */}
      <div className="wizard-bar">
        {WIZARD_STEPS.map((s, i) => (
          <React.Fragment key={s.key}>
            <div
              className={`wizard-step ${i < stepIndex ? "wizard-step-done" : i === stepIndex ? "wizard-step-active" : "wizard-step-todo"}`}
              onClick={() => { if (i <= stepIndex) setStep(s.key); }}
              style={{ cursor: i <= stepIndex ? "pointer" : "default" }}
            >
              {i < stepIndex ? "✓" : i + 1} {s.label}
            </div>
            {i < WIZARD_STEPS.length - 1 && <span className="wizard-arrow">→</span>}
          </React.Fragment>
        ))}
      </div>

      {/* Steps */}
      {step === "upload" && <UploadStep onDemo={handleDemo} onUpload={handleUpload} />}
      {step === "extract" && <ExtractStep data={reportData} onNext={() => goTo("score")} />}
      {step === "score" && <ScoreStep reportData={reportData} initialInputs={scoreInputs} onNext={() => goTo("migrate")} />}
      {step === "migrate" && <MigrateStep onNext={() => goTo("preview")} />}
      {step === "preview" && <PreviewStep />}
    </div>
  );
}
