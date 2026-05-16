import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronRight, ChevronDown, FileCode, Folder, FolderOpen, Play, Bot, Database, Brain, FileCheck, GitCompare, ArrowRight, Shield, Zap, CheckCircle, AlertTriangle, Clock, Upload, RefreshCw, BarChart3, TrendingUp, PieChart } from "lucide-react";

// ═══════════════════════════════════════════════════════════════════
// DEMO MODE — Pre-generated pipeline output (no backend needed)
// ═══════════════════════════════════════════════════════════════════
const DEMO_OUTPUT = {
  report_name: "Life_Insurance_Underwriting_Summary",
  source_system: "IBM Cognos Analytics 14.1",
  target_system: "Microsoft Power BI",
  pipeline_version: "1.0.0",
  generated_at: "2026-05-08T22:07:47Z",
  summary: {
    visual_count: 9, filter_count: 3, calc_count: 8, field_count: 21, prompt_count: 4, query_count: 2
  },
  agents: [
    {
      id: "gatherer",
      name: "Code Gatherer",
      icon: Database,
      status: "complete",
      description: "XPath-based XML parser extracts all visual definitions, queries, filters, prompts, and data source references from Cognos report spec.",
      output: { visuals: 9, queries: 2, filters: 3, prompts: 4, data_fields: 21 },
      duration_ms: 120
    },
    {
      id: "analyzer",
      name: "Analyzer",
      icon: Brain,
      status: "complete",
      description: "Complexity scoring engine evaluates migration difficulty across 7 dimensions: visual types, calculated measures, filter complexity, crosstabs, parameterized prompts, unsupported features, data model complexity.",
      output: { band: "Medium", score: 52, risk: "Medium", effort: "16–48 hours (recommended: 32)" },
      duration_ms: 45
    },
    {
      id: "converter",
      name: "Converter",
      icon: Play,
      status: "complete",
      description: "Rule-based engine maps Cognos visuals → Power BI equivalents, translates Cognos expressions → DAX measures, and generates migration notes for each component.",
      output: { visuals_mapped: "9/9", measures_generated: 8, auto_translated: 6, needs_review: 2, migration_notes: 3 },
      duration_ms: 210
    },
    {
      id: "reviewer",
      name: "Reviewer",
      icon: FileCheck,
      status: "warn",
      description: "Validation engine runs 7 quality checks: visual mapping coverage, DAX translation coverage, filter/prompt alignment, row count parity, measure values, filter behavior, NULL handling.",
      output: { checks_passed: 1, checks_warned: 2, checks_stubbed: 4 },
      warnings: ["⏳ Row count comparison requires live XMLA endpoint", "⏳ Measure value spot-checks need SDK access", "⚠ 2 visuals need partial manual config", "⚠ 2 DAX measures need manual review"],
      duration_ms: 85
    }
  ],
  visuals: [
    { id: "DecisionBreakdownChart", type: "bar_chart", pbi: "clusteredBarChart", mapping: "full", title: "Underwriting Decisions Distribution" },
    { id: "MonthlyVolumeTrend", type: "line_chart", pbi: "lineChart", mapping: "full", title: "Monthly Policy Volume and Face Amount Trend" },
    { id: "SmokerDistributionChart", type: "pie_chart", pbi: "pieChart", mapping: "full", title: "Smoker vs Non-Smoker Distribution" },
    { id: "TotalPoliciesKPI", type: "card", pbi: "card", mapping: "full", title: "Total Policies Issued" },
    { id: "TotalFaceAmountKPI", type: "card", pbi: "card", mapping: "full", title: "Total Face Amount ($)" },
    { id: "STPRateKPI", type: "card", pbi: "card", mapping: "full", title: "STP Rate (%)" },
    { id: "AvgPremiumKPI", type: "card", pbi: "card", mapping: "full", title: "Average Annual Premium" },
    { id: "ProvinceRatingCrosstab", type: "matrix", pbi: "matrix", mapping: "partial", title: "Policy Distribution by Province and Rating Class" },
    { id: "TopPoliciesList", type: "table", pbi: "tableEx", mapping: "partial", title: "Policy Detail" },
  ],
  dax_measures: [
    { name: "Total Policies Issued", method: "pattern_matched", review: false },
    { name: "Total Face Amount", method: "pattern_matched", review: false },
    { name: "Avg Premium", method: "pattern_matched", review: false },
    { name: "STP Rate", method: "pattern_matched", review: true },
    { name: "Rated Cases", method: "pattern_matched", review: true },
    { name: "Policy Count", method: "pattern_matched", review: false },
    { name: "Total Premium", method: "pattern_matched", review: false },
    { name: "Avg Risk Score", method: "pattern_matched", review: false },
  ],
  complexity_drivers: [
    "Partial-support visuals (2): +10 pts",
    "Crosstab/matrix visuals (1): +8 pts",
    "Calculated measures (2): +8 pts",
    "Date range filters (1): +5 pts",
    "Multi-select filters (2): +6 pts",
    "Multiple queries (2): +3 pts",
    "Parameterized prompts (4): +12 pts",
  ]
};

// ═══════════════════════════════════════════════════════════════════
// VS CODE-STYLE SOLUTION EXPLORER
// ═══════════════════════════════════════════════════════════════════
interface FileNode { name: string; type: "folder" | "file"; children?: FileNode[]; icon?: string }

const PROJECT_TREE: FileNode[] = [
  {
    name: "cognos-migration-accelerator", type: "folder", children: [
      { name: ".gitignore", type: "file" },
      { name: "package.json", type: "file" },
      { name: "README.md", type: "file" },
      { name: "SECURITY_SUMMARY.md", type: "file" },
      { name: "vite.config.ts", type: "file" },
      { name: "index.html", type: "file" },
      {
        name: "src", type: "folder", children: [
          { name: "main.tsx", type: "file" },
          { name: "App.tsx", type: "file" },
          { name: "styles.css", type: "file" },
          {
            name: "pages", type: "folder", children: [
              { name: "cognos-agentic.tsx", type: "file", icon: "⚡" },
              { name: "complexity-scorer.tsx", type: "file" },
            ]
          },
        ]
      },
      {
        name: "server", type: "folder", children: [
          { name: "index.ts", type: "file", icon: "🚀" },
          { name: "package.json", type: "file" },
        ]
      },
      {
        name: "pipeline", type: "folder", children: [
          { name: "requirements.txt", type: "file" },
          {
            name: "pipeline", type: "folder", children: [
              { name: "extractor.py", type: "file" },
              { name: "ir_generator.py", type: "file" },
              { name: "rule_engine.py", type: "file" },
              { name: "complexity_scorer.py", type: "file" },
              { name: "validator.py", type: "file" },
              { name: "main.py", type: "file" },
              { name: "mock_cognos_report.xml", type: "file" },
            ]
          },
          {
            name: "output", type: "folder", children: [
              { name: "migration_result.json", type: "file" },
              { name: "LifeInsurance_Measures_Generated.dax", type: "file" },
            ]
          },
        ]
      },
    ]
  }
];

function TreeRow({ node, depth = 0 }: { node: FileNode; depth?: number }) {
  const [open, setOpen] = useState(depth < 1);
  const isFolder = node.type === "folder";
  const pad = { paddingLeft: `${depth * 16 + 8}px` };

  return (
    <>
      <div
        className={`flex items-center gap-1.5 py-0.5 cursor-pointer hover:bg-gray-50 text-[12px] ${isFolder ? "text-gray-700" : "text-gray-600"}`}
        style={pad}
        onClick={() => isFolder && setOpen(!open)}
      >
        {isFolder ? (
          open ? <ChevronDown size={12} className="text-gray-500" /> : <ChevronRight size={12} className="text-gray-500" />
        ) : <span className="w-3" />}
        {isFolder ? (
          open ? <FolderOpen size={14} className="text-amber-500 shrink-0" /> : <Folder size={14} className="text-amber-500 shrink-0" />
        ) : (
          <FileCode size={14} className="text-blue-400 shrink-0" />
        )}
        <span className="truncate">{node.name}</span>
        {node.icon && <span className="ml-auto text-[10px]">{node.icon}</span>}
      </div>
      {isFolder && open && node.children?.map((child, i) => (
        <TreeRow key={i} node={child} depth={depth + 1} />
      ))}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════
// AGENT PIPELINE COMPONENT
// ═══════════════════════════════════════════════════════════════════
function AgentPipeline({
  agents,
  currentPipelineStep,
  onAgentClick,
}: {
  agents: any[];
  currentPipelineStep: string | null;
  onAgentClick: (agent: any) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <Bot size={18} className="text-emerald-400" />
        <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Agentic AI Pipeline</h2>
        <span className="text-[10px] text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full">DEMO MODE</span>
      </div>

      {/* Pipeline flow */}
      <div className="flex items-center gap-0 flex-wrap">
        {agents.map((agent, i) => (
          <div key={agent.id} className="flex items-center gap-0">
            <button
              onClick={() => onAgentClick(agent)}
              className={`group flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all min-w-[120px] cursor-pointer
                ${currentPipelineStep === agent.id
                  ? "border-emerald-500/50 bg-emerald-500/10"
                  : agent.status === "warn"
                    ? "border-amber-500/30 bg-amber-500/5 hover:border-amber-500/50"
                    : "border-gray-200/50 bg-gray-50/50 hover:border-gray-300"}`}
            >
              <div className={`p-2 rounded-md ${agent.status === "warn" ? "bg-amber-500/15" : "bg-emerald-500/15"}`}>
                <agent.icon size={20} className={agent.status === "warn" ? "text-amber-400" : "text-emerald-400"} />
              </div>
              <span className="text-[11px] font-medium text-gray-800 text-center">{agent.name}</span>
              <span className={`text-[9px] uppercase tracking-widest ${agent.status === "warn" ? "text-amber-400" : "text-emerald-400"}`}>
                {agent.status === "warn" ? "⚠ WARN" : "✓ DONE"}
              </span>
              <span className="text-[9px] text-gray-500">{agent.duration_ms}ms</span>
            </button>
            {i < agents.length - 1 && <ArrowRight size={16} className="text-zinc-600 mx-1 shrink-0" />}
          </div>
        ))}
      </div>

      {/* Agent detail panel */}
      {currentPipelineStep && (() => {
        const agent = agents.find(a => a.id === currentPipelineStep)!;
        return (
          <div className="mt-3 p-4 rounded-lg border border-emerald-500/20 bg-white/30">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">{agent.name}</h3>
                <p className="text-[11px] text-gray-600 mt-1 leading-relaxed">{agent.description}</p>
              </div>
              <span className="text-[10px] text-gray-500 bg-gray-50 px-2 py-0.5 rounded">{agent.duration_ms}ms</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(agent.output).map(([k, v]) => (
                <div key={k} className="bg-gray-50/50 rounded px-3 py-1.5">
                  <span className="text-[10px] text-gray-500 uppercase">{k.replace(/_/g, " ")}</span>
                  <div className="text-xs text-gray-800 font-mono">{String(v)}</div>
                </div>
              ))}
            </div>
            {agent.warnings && (
              <div className="mt-3 space-y-1">
                {agent.warnings.map((w, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-[11px] text-amber-400">
                    <AlertTriangle size={11} className="shrink-0 mt-0.5" />
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// AGENTIC vs RPA COMPARISON
// ═══════════════════════════════════════════════════════════════════
function ComparisonTable() {
  const rows = [
    { aspect: "Approach", agentic: "Multi-agent pipeline: Gatherer → Analyzer → Converter → Reviewer", rpa: "Screen-scraping macros; button-by-button recording" },
    { aspect: "XML Parsing", agentic: "XPath-based semantic extraction — understands report structure", rpa: "Pixel-matching or OCR — brittle, breaks on UI changes" },
    { aspect: "Visual Mapping", agentic: "Canonical IR with rule engine — supports 15+ visual types", rpa: "Manual copy-paste or hard-coded mapping per report" },
    { aspect: "DAX Translation", agentic: "Pattern-matching engine with 20+ expression patterns. Auto-generates all 8 measures.", rpa: "Requires SME to manually rewrite every Cognos expression" },
    { aspect: "Validation", agentic: "6 quality checks: mapping coverage, DAX parity, row counts, measure values, filter behavior, NULL handling", rpa: "No validation — errors discovered in production" },
    { aspect: "Scalability", agentic: "Process 50+ reports in parallel. Each agent runs independently.", rpa: "One report at a time. Each takes 2-3x longer." },
    { aspect: "Maintainability", agentic: "Add new visual type → update one rule in VISUAL_MAP. 5 minutes.", rpa: "Re-record entire macro. Hours per change." },
    { aspect: "Audit Trail", agentic: "Full IR + migration notes per visual + validation report in JSON", rpa: "None — outputs are opaque" },
  ];

  return (
    <div className="mt-6">
      <div className="flex items-center gap-2 mb-3">
        <GitCompare size={18} className="text-blue-400" />
        <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Agentic AI vs. RPA/Legacy</h2>
      </div>
      <div className="overflow-x-auto rounded-lg border border-gray-200/50">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50/50">
              <th className="text-left p-2.5 text-gray-600 font-medium uppercase tracking-wider w-32">Dimension</th>
              <th className="text-left p-2.5 text-emerald-400 font-medium uppercase tracking-wider">🤖 Agentic AI</th>
              <th className="text-left p-2.5 text-gray-500 font-medium uppercase tracking-wider">🖥 RPA / Legacy</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className={i % 2 === 0 ? "bg-white/30" : "bg-gray-100"}>
                <td className="p-2.5 text-gray-700 font-medium">{row.aspect}</td>
                <td className="p-2.5 text-gray-800">{row.agentic}</td>
                <td className="p-2.5 text-gray-500">{row.rpa}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// VISUAL MAPPING / DAX TABS
// ═══════════════════════════════════════════════════════════════════
function OutputTabs() {
  const [tab, setTab] = useState<"visuals" | "dax" | "complexity" | "pbi">("visuals");

  const tabs = [
    { id: "visuals", label: "Visual Mapping (9)", icon: Play },
    { id: "dax", label: "DAX Measures (8)", icon: FileCode },
    { id: "complexity", label: "Complexity Drivers", icon: AlertTriangle },
    { id: "pbi", label: "Power BI Report", icon: BarChart3 },
  ] as const;

  return (
    <div className="mt-6">
      <div className="flex items-center gap-2 mb-3">
        <FileCheck size={18} className="text-purple-400" />
        <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Migration Output</h2>
      </div>

      <div className="flex gap-1 mb-3">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-medium transition-all cursor-pointer
              ${tab === t.id ? "bg-zinc-700 text-gray-900" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50/50"}`}
          >
            <t.icon size={13} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "visuals" && (
        <div className="rounded-lg border border-gray-200/50 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="text-left p-2 text-gray-600">Visual</th>
                <th className="text-left p-2 text-gray-600">Cognos Type</th>
                <th className="text-left p-2 text-gray-600">Power BI</th>
                <th className="text-left p-2 text-gray-600">Mapping</th>
              </tr>
            </thead>
            <tbody>
              {DEMO_OUTPUT.visuals.map((v, i) => (
                <tr key={v.id} className={i % 2 === 0 ? "bg-white/30" : ""}>
                  <td className="p-2 text-gray-800 font-mono text-[11px]">{v.title}</td>
                  <td className="p-2 text-gray-600 font-mono text-[11px]">{v.type}</td>
                  <td className="p-2 text-gray-700 font-mono text-[11px]">{v.pbi}</td>
                  <td className="p-2">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium
                      ${v.mapping === "full" ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"}`}>
                      {v.mapping === "full" ? "full" : "partial"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "dax" && (
        <div className="rounded-lg border border-gray-200/50 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="text-left p-2 text-gray-600">Measure</th>
                <th className="text-left p-2 text-gray-600">Method</th>
                <th className="text-left p-2 text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {DEMO_OUTPUT.dax_measures.map((m, i) => (
                <tr key={m.name} className={i % 2 === 0 ? "bg-white/30" : ""}>
                  <td className="p-2 text-gray-800 font-mono text-[11px]">{m.name}</td>
                  <td className="p-2 text-gray-600 font-mono text-[11px]">{m.method}</td>
                  <td className="p-2">
                    {m.review ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-medium">REVIEW</span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-medium">AUTO</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "complexity" && (
        <div className="rounded-lg border border-gray-200/50 p-4 bg-white/30">
          <div className="flex items-center gap-3 mb-3">
            <div className="text-center">
              <div className="text-3xl font-bold text-amber-400">52</div>
              <div className="text-[9px] text-gray-500 uppercase">Score</div>
            </div>
            <div className="h-8 w-px bg-zinc-700" />
            <div>
              <div className="text-sm font-semibold text-amber-400">Medium Complexity</div>
              <div className="text-[10px] text-gray-500">16–48 hours (recommended: 32)</div>
            </div>
          </div>
          <div className="space-y-1">
            {DEMO_OUTPUT.complexity_drivers.map((d, i) => (
              <div key={i} className="text-[11px] text-gray-600 font-mono">• {d}</div>
            ))}
          </div>
        </div>
      )}

      {tab === "pbi" && (
        <div className="rounded-lg border border-gray-200/50 overflow-hidden bg-white">
          {/* Power BI header bar */}
          <div className="bg-gray-50 border-b border-gray-200/50 px-4 py-3 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-gray-900">Life Insurance Underwriting Summary</div>
              <div className="text-[10px] text-gray-600">Power BI Report</div>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-gray-500">
              <span className="bg-gray-100 px-2 py-0.5 rounded">Year 2024</span>
              <span className="bg-gray-100 px-2 py-0.5 rounded">All Provinces</span>
              <span className="bg-gray-100 px-2 py-0.5 rounded">All Decisions</span>
            </div>
          </div>
          
          {/* Dashboard grid */}
          <div className="p-4 space-y-4">
            {/* KPI Row */}
            <div className="grid grid-cols-4 gap-3">
              <div className="bg-gray-50 border border-gray-200/30 rounded-lg p-4">
                <div className="text-[10px] text-gray-600 uppercase mb-2 tracking-wider">Total Policies Issued</div>
                <div className="text-2xl font-bold text-gray-900">24,850</div>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp size={12} className="text-emerald-400" />
                  <span className="text-[10px] text-emerald-400">+12.4%</span>
                </div>
              </div>
              <div className="bg-gray-50 border border-gray-200/30 rounded-lg p-4">
                <div className="text-[10px] text-gray-600 uppercase mb-2 tracking-wider">Total Face Amount ($)</div>
                <div className="text-2xl font-bold text-gray-900">$3.42B</div>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp size={12} className="text-emerald-400" />
                  <span className="text-[10px] text-emerald-400">+8.9%</span>
                </div>
              </div>
              <div className="bg-gray-50 border border-gray-200/30 rounded-lg p-4">
                <div className="text-[10px] text-gray-600 uppercase mb-2 tracking-wider">STP Rate (%)</div>
                <div className="text-2xl font-bold text-gray-900">72.3%</div>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp size={12} className="text-emerald-400" />
                  <span className="text-[10px] text-emerald-400">+3.1pp</span>
                </div>
              </div>
              <div className="bg-gray-50 border border-gray-200/30 rounded-lg p-4">
                <div className="text-[10px] text-gray-600 uppercase mb-2 tracking-wider">Avg Annual Premium</div>
                <div className="text-2xl font-bold text-gray-900">$2,845</div>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp size={12} className="text-emerald-400" />
                  <span className="text-[10px] text-emerald-400">+5.2%</span>
                </div>
              </div>
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-3 gap-3">
              {/* Bar chart: Underwriting Decisions */}
              <div className="col-span-2 bg-gray-50 border border-gray-200/30 rounded-lg p-4">
                <div className="text-[11px] text-gray-700 font-medium mb-3">Underwriting Decisions Distribution</div>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-[10px] text-gray-600 mb-1">
                      <span>Approved</span><span>12,842</span>
                    </div>
                    <div className="h-5 bg-gray-100 rounded overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded" style={{width: "52%"}} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] text-gray-600 mb-1">
                      <span>Rated</span><span>6,213</span>
                    </div>
                    <div className="h-5 bg-gray-100 rounded overflow-hidden">
                      <div className="h-full bg-amber-400 rounded" style={{width: "25%"}} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] text-gray-600 mb-1">
                      <span>Declined</span><span>3,728</span>
                    </div>
                    <div className="h-5 bg-gray-100 rounded overflow-hidden">
                      <div className="h-full bg-red-400 rounded" style={{width: "15%"}} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] text-gray-600 mb-1">
                      <span>Postponed</span><span>2,067</span>
                    </div>
                    <div className="h-5 bg-gray-100 rounded overflow-hidden">
                      <div className="h-full bg-zinc-400 rounded" style={{width: "8%"}} />
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-4 mt-3 text-[10px] text-gray-500">
                  {["Approved","Rated","Declined","Postponed"].map((l,i) => (
                    <div key={i} className="flex items-center gap-1">
                      <div className={`w-2 h-2 rounded ${["bg-emerald-500","bg-amber-400","bg-red-400","bg-zinc-400"][i]}`} />
                      {l}
                    </div>
                  ))}
                </div>
              </div>

              {/* Pie chart: Smoker Distribution */}
              <div className="bg-gray-50 border border-gray-200/30 rounded-lg p-4">
                <div className="text-[11px] text-gray-700 font-medium mb-3">Smoker vs Non-Smoker</div>
                <div className="flex flex-col items-center gap-2">
                  <div className="relative w-28 h-28 rounded-full border-[10px] border-emerald-500/80 border-l-amber-500/80 border-b-amber-500/80" style={{transform: "rotate(-30deg)"}}>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-sm font-bold text-gray-900">68%</span>
                      <span className="text-[9px] text-gray-500">Non-Smoker</span>
                    </div>
                  </div>
                  <div className="flex gap-4 mt-2 text-[10px] text-gray-600">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 bg-emerald-500 rounded" />
                      Non-Smoker (68%)
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 bg-amber-500 rounded" />
                      Smoker (32%)
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Line chart: Monthly Trend */}
            <div className="bg-gray-50 border border-gray-200/30 rounded-lg p-4">
              <div className="text-[11px] text-gray-700 font-medium mb-3">Monthly Policy Volume & Face Amount Trend</div>
              <div className="h-32 flex items-end gap-1 px-2">
                {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((m, i) => {
                  const h1 = [65,68,72,58,78,82,88,92,85,80,75,90][i];
                  const h2 = [40,45,50,42,55,60,65,70,62,55,50,68][i];
                  return (
                    <div key={m} className="flex-1 flex flex-col items-center gap-0.5">
                      <div className="w-full flex flex-col gap-0.5" style={{height: "120px"}}>
                        <div style={{height: `${100-h1}%`}} />
                        <div className="w-3/5 mx-auto bg-blue-400/60 rounded-sm" style={{height: `${h1}%`, background: "linear-gradient(180deg, #60a5fa, #3b82f6)"}} />
                        <div className="h-0.5" />
                        <div style={{height: `${100-h2}%`}} />
                        <div className="w-1/3 mx-auto bg-emerald-400/60 rounded-sm" style={{height: `${h2}%`, background: "linear-gradient(180deg, #34d399, #059669)"}} />
                      </div>
                      <span className="text-[8px] text-gray-500 mt-1">{m}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-center gap-4 mt-2 text-[10px] text-gray-600">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-1.5 rounded bg-blue-400" /> Policies
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-1.5 rounded bg-emerald-400" /> Face Amount
                </div>
              </div>
            </div>

            {/* Matrix + Table row */}
            <div className="grid grid-cols-5 gap-3">
              {/* Matrix: Province x Rating */}
              <div className="col-span-3 bg-gray-50 border border-gray-200/30 rounded-lg p-4">
                <div className="text-[11px] text-gray-700 font-medium mb-2">Policy Distribution by Province & Rating Class</div>
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="text-gray-600">
                      <th className="text-left py-1">Province</th>
                      <th className="text-right py-1">Preferred</th>
                      <th className="text-right py-1">Standard</th>
                      <th className="text-right py-1">Rated</th>
                      <th className="text-right py-1 font-medium text-gray-700">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["Ontario", "4,210", "2,850", "1,940", "9,000"],
                      ["Quebec", "2,100", "1,680", "980", "4,760"],
                      ["British Columbia", "1,890", "1,520", "740", "4,150"],
                      ["Alberta", "1,520", "1,180", "560", "3,260"],
                      ["Manitoba", "640", "480", "220", "1,340"],
                    ].map((r, i) => (
                      <tr key={i} className={i % 2 === 0 ? "bg-white/[0.02]" : ""}>
                        <td className="py-1 text-gray-700">{r[0]}</td>
                        {r.slice(1, 4).map((v, j) => (
                          <td key={j} className="text-right py-1 text-gray-600">{v}</td>
                        ))}
                        <td className="text-right py-1 font-medium text-gray-800">{r[4]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Table: Policy Detail */}
              <div className="col-span-2 bg-gray-50 border border-gray-200/30 rounded-lg p-4">
                <div className="text-[11px] text-gray-700 font-medium mb-2">Top Policies by Face Amount</div>
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="text-gray-500">
                      <th className="text-left py-1">Policy ID</th>
                      <th className="text-right py-1">Face Amt</th>
                      <th className="text-right py-1">Decision</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["POL-2024-0842", "$5.2M", "Approved"],
                      ["POL-2024-1501", "$4.8M", "Rated"],
                      ["POL-2024-0298", "$4.5M", "Approved"],
                      ["POL-2024-1124", "$3.9M", "Approved"],
                      ["POL-2024-0765", "$3.6M", "Declined"],
                    ].map((r, i) => (
                      <tr key={i} className={i % 2 === 0 ? "bg-white/[0.02]" : ""}>
                        <td className="py-1 text-blue-400 font-mono">{r[0]}</td>
                        <td className="text-right py-1 text-gray-700">{r[1]}</td>
                        <td className="text-right py-1">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] ${
                            r[2] === "Approved" ? "bg-emerald-500/15 text-emerald-400" :
                            r[2] === "Rated" ? "bg-amber-500/15 text-amber-400" :
                            "bg-red-500/15 text-red-400"
                          }`}>{r[2]}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          
          {/* Footer */}
          <div className="px-4 py-2 border-t border-gray-200/30 flex items-center justify-between text-[9px] text-zinc-600">
            <span>All 9 visuals migrated from Cognos — 7 full auto-mapping, 2 partial</span>
            <span>Generated {DEMO_OUTPUT.generated_at}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════
export default function CognosAgenticDemo() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Pipeline state machine: "idle" | "uploaded" | "running" | "complete"
  const [phase, setPhase] = useState<"idle" | "uploaded" | "running" | "complete">("idle");
  const [currentStep, setCurrentStep] = useState(-1);
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const stepTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const agents = DEMO_OUTPUT.agents;

  const startPipeline = useCallback(() => {
    if (stepTimer.current) clearInterval(stepTimer.current);
    setPhase("running");
    setCurrentStep(0);
    setActiveAgent(agents[0].id);
    let step = 0;
    stepTimer.current = setInterval(() => {
      step++;
      if (step >= agents.length) {
        clearInterval(stepTimer.current!);
        stepTimer.current = null;
        setPhase("complete");
        setActiveAgent(null);
        setCurrentStep(-1);
      } else {
        setCurrentStep(step);
        setActiveAgent(agents[step].id);
      }
    }, 1200);
  }, [agents]);

  const reset = useCallback(() => {
    if (stepTimer.current) { clearInterval(stepTimer.current); stepTimer.current = null; }
    setPhase("idle");
    setCurrentStep(-1);
    setActiveAgent(null);
    setUploadedFile(null);
  }, []);

  useEffect(() => {
    return () => { if (stepTimer.current) clearInterval(stepTimer.current); };
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    setUploadedFile("Life_Insurance_Underwriting_Summary.xml");
    setPhase("uploaded");
  }, []);

  return (
    <div className="flex h-screen bg-[#fafbfc] text-gray-800 overflow-hidden">
      {/* ── Solution Explorer Sidebar ── */}
      <div className={`${sidebarOpen ? "w-72" : "w-0"} transition-all duration-200 border-r border-gray-200 bg-gray-50 overflow-hidden shrink-0`}>
        <div className="p-3 border-b border-gray-200 flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold">Solution Explorer</span>
          <button onClick={() => setSidebarOpen(false)} className="text-zinc-600 hover:text-gray-600 cursor-pointer">
            <ChevronRight size={14} />
          </button>
        </div>
        <div className="overflow-y-auto h-[calc(100vh-40px)] py-1">
          {PROJECT_TREE.map((node, i) => <TreeRow key={i} node={node} />)}
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="flex-1 overflow-y-auto">
        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-[#fafbfc]/95 backdrop-blur border-b border-gray-200 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {!sidebarOpen && (
              <button onClick={() => setSidebarOpen(true)} className="text-zinc-600 hover:text-gray-600 cursor-pointer">
                <ChevronRight size={16} />
              </button>
            )}
            <div>
              <h1 className="text-sm font-semibold text-gray-900">Cognos → Power BI Migration Accelerator</h1>
              <p className="text-[10px] text-gray-500">
                {DEMO_OUTPUT.report_name} • {DEMO_OUTPUT.source_system} → {DEMO_OUTPUT.target_system}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {phase !== "idle" && (
              <button
                onClick={reset}
                className="flex items-center gap-1.5 text-[10px] text-gray-600 hover:text-gray-800 bg-gray-50/50 hover:bg-gray-100/50 px-2.5 py-1 rounded-full transition-all cursor-pointer"
              >
                <RefreshCw size={11} />
                Reset
              </button>
            )}
            <span className="flex items-center gap-1.5 text-[10px] text-gray-500 bg-gray-50/50 px-2.5 py-1 rounded-full">
              <Shield size={11} className="text-emerald-500" />
              Demo Mode • Zero Egress
            </span>
            <span className="text-[9px] text-zinc-600">v{DEMO_OUTPUT.pipeline_version}</span>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-5xl mx-auto p-6 space-y-6">
          {/* ══ Upload Screen (Phase: idle) ══ */}
          {phase === "idle" && (
            <div className="flex flex-col items-center justify-center py-20">
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`w-full max-w-lg border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer
                  ${dragOver ? "border-emerald-400 bg-emerald-500/10" : "border-gray-200 hover:border-gray-300 bg-white/30"}`}
                onClick={() => { setUploadedFile("Life_Insurance_Underwriting_Summary.xml"); setPhase("uploaded"); }}
              >
                <Upload size={48} className="mx-auto text-gray-500 mb-4" />
                <h3 className="text-base font-semibold text-gray-800 mb-2">Upload Cognos Report XML</h3>
                <p className="text-xs text-gray-500 mb-4">Drag & drop your Cognos report spec here, or click to use the sample</p>
                <div className="flex items-center justify-center gap-2 text-[10px] text-zinc-600">
                  <FileCode size={12} /> .xml files • Runs locally • No data leaves your browser
                </div>
              </div>
              <p className="text-[10px] text-zinc-700 mt-6">Click anywhere on the upload area to start with the sample Life Insurance Underwriting report</p>
            </div>
          )}

          {/* ══ Upload Confirmation (Phase: uploaded) ══ */}
          {phase === "uploaded" && (
            <div className="flex flex-col items-center justify-center py-16 space-y-6">
              <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-6 py-4">
                <CheckCircle size={24} className="text-emerald-400" />
                <div>
                  <div className="text-sm font-semibold text-gray-900">Report loaded</div>
                  <div className="text-[11px] text-gray-600 font-mono">{uploadedFile}</div>
                </div>
              </div>

              <button
                onClick={startPipeline}
                className="flex items-center gap-2 px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-gray-900 rounded-lg font-semibold text-sm transition-all cursor-pointer shadow-lg shadow-emerald-500/20"
              >
                <Play size={16} />
                Run Pipeline
              </button>

              <button onClick={reset} className="text-[11px] text-zinc-600 hover:text-gray-600 cursor-pointer">
                ← Upload a different file
              </button>
            </div>
          )}

          {/* ══ Pipeline Running & Complete ══ */}
          {(phase === "running" || phase === "complete") && (
            <>
              {/* Animated status banner */}
              {phase === "running" && (
                <div className="flex items-center gap-3 bg-blue-500/10 border border-blue-500/20 rounded-lg px-5 py-3">
                  <div className="w-3 h-3 rounded-full bg-blue-400 animate-ping" />
                  <div className="text-sm font-medium text-blue-400">
                    Processing: {agents[currentStep]?.name ?? "Starting..."}
                  </div>
                  <div className="flex-1" />
                  <span className="text-[10px] text-gray-500">
                    Step {currentStep + 1} of {agents.length}
                  </span>
                </div>
              )}

              {/* Pipeline agent cards */}
              <AgentPipeline
                agents={agents.map((a, i) => ({
                  ...a,
                  status: phase === "complete"
                    ? a.status
                    : i < currentStep ? "complete" : i === currentStep ? "running" : "idle"
                }))}
                currentPipelineStep={activeAgent}
                onAgentClick={(a) => setActiveAgent(activeAgent === a.id ? null : a.id)}
              />

              {phase === "complete" && (
                <>
                  {/* Pipeline Summary */}
                  <div className="grid grid-cols-4 gap-3">
                    <div className="bg-gray-500 border border-gray-200/50 rounded-lg p-3">
                      <div className="text-[10px] text-gray-500 uppercase">Agents</div>
                      <div className="text-lg font-bold text-gray-900">4</div>
                      <div className="text-[9px] text-zinc-600">Gatherer → Analyzer → Converter → Reviewer</div>
                    </div>
                    <div className="bg-gray-500 border border-gray-200/50 rounded-lg p-3">
                      <div className="text-[10px] text-gray-500 uppercase">Visuals Mapped</div>
                      <div className="text-lg font-bold text-emerald-400">9/9</div>
                      <div className="text-[9px] text-zinc-600">7 full • 2 partial</div>
                    </div>
                    <div className="bg-gray-500 border border-gray-200/50 rounded-lg p-3">
                      <div className="text-[10px] text-gray-500 uppercase">DAX Generated</div>
                      <div className="text-lg font-bold text-emerald-400">8</div>
                      <div className="text-[9px] text-zinc-600">6 auto • 2 review</div>
                    </div>
                    <div className="bg-gray-500 border border-amber-500/20 rounded-lg p-3">
                      <div className="text-[10px] text-gray-500 uppercase">Complexity</div>
                      <div className="text-lg font-bold text-amber-400">Medium</div>
                      <div className="text-[9px] text-zinc-600">Score: 52 • ~32 hours</div>
                    </div>
                  </div>
                  <ComparisonTable />
                  <OutputTabs />
                  <div className="pt-6 border-t border-gray-200/50 text-center">
                    <p className="text-[10px] text-zinc-600">
                      Runs entirely in your browser. No API keys. No telemetry. No data leaves your machine.
                      <span className="ml-2 text-zinc-700">Pipeline output from {DEMO_OUTPUT.generated_at}</span>
                    </p>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}