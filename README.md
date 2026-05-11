# Cognos → Power BI Migration Accelerator
### Proof of Concept | Life Insurance Practice

> **GitHub Source:** https://github.com/tattvamasea-eng/cognos-migration-accelerator

This project automates IBM Cognos Analytics report migration to Microsoft Power BI. It parses a Cognos XML report spec, generates a canonical Intermediate Representation (IR), applies rule-based visual mapping and DAX translation, scores migration complexity, and validates output — all in a single `python main.py` run.

---

## Live Demo

**Zo Preview (authenticated, you only):**
- Open `file '/home/workspace/cognos-migration-accelerator'` in the Zo app → click the preview iframe
- Or visit: `https://zite-54924-{host}.zo.computer` (shown in Zo UI)

**Routes:**

| Route | Description |
|-------|-------------|
| `/` | **5-step wizard** — Upload → Extract → Score → Migrate → Preview |
| `/scorer` | **Standalone dark-mode scorer** — SVG gauge, per-item counting, JSON export |

**For external audiences:** Click the **Publish** button in the Zo UI toolbar. This creates a public URL (e.g., `https://cognos-migration-accelerator-tattvamasi.zocomputer.io`).

> **Note:** A platform-side sandbox issue prevents programmatic publishing via the `publish_site` tool. Use the Zo UI Publish button instead.

---

## What's New (vs. Original GitHub Repo)

| Change | Before | After |
|--------|--------|-------|
| **Demo flow** | 3 isolated tabs (Score / Migrate / Preview) | 5-step wizard with logical progression |
| **Entry point** | Starts at Score tab | Starts at Upload step with drag-and-drop |
| **Scoring** | Form-based (numVisuals, numQueries, dropdowns) | Per-item counting (8 visual types × count, 5 calc types × count, 4 filter types × count) |
| **Visual design** | Light theme, basic styling | Dark theme, SVG gauge, mapping legend, sticky score panel |
| **Cross-navigation** | None | Link between main wizard and standalone scorer |
| **Report intake** | None — user had to imagine the report | Animated extraction simulation with mock data |
| **JSON export** | Button that did nothing | Working file download with full payload |
| **Pipeline wiring** | Fully simulated (frontend only) | Still simulated — FastAPI backend not yet built |

---

## Completion Status

### ✅ Done (working code)

| Component | Status | Notes |
|-----------|--------|-------|
| **Python Pipeline** | ✅ Complete | `extractor.py` → `ir_generator.py` → `rule_engine.py` → `validator.py` → `complexity_scorer.py`. Runs end-to-end against mock XML. |
| **XPath XML Parser** | ✅ Complete | Extracts metadata, data sources, queries, visuals, filters, prompts across 5 extraction zones |
| **Canonical IR** | ✅ Complete | Decouples Cognos from PBI. Normalized visuals, filters, calculations, data fields |
| **Visual Mapping Rules** | ✅ Complete | 9 Cognos types → Power BI equivalents (bar→clusteredBarChart, crosstab→matrix, etc.) |
| **DAX Translation** | ✅ Complete | 8 regex patterns + aggregate stubs. Generates `.dax` file with review flags |
| **Complexity Scorer (Python)** | ✅ Complete | Weighted scoring: visuals (5–15 pts), calcs (4–8 pts), filters (3–5 pts), prompts (3 pts). Low/Medium/High bands with hour estimates |
| **Validation Engine** | ⚠️ Partial | 3 live checks (visual mapping, DAX coverage, filter alignment) + 4 stubs (row count, measure values, filter parity, NULL handling) |
| **Frontend — Upload Step** | ✅ Complete | Drag-and-drop zone, demo report loader, validation |
| **Frontend — Extract Step** | ✅ Complete | Animated extraction simulation with real mock data |
| **Frontend — Score Step** | ✅ Complete | Per-item counting, SVG gauge, effort bars, score drivers, unsupported features warning, JSON export |
| **Frontend — Migrate Step** | ✅ Complete | Animated 5-step pipeline simulation, JSON/DAX output tabs, summary stats |
| **Frontend — Preview Step** | ✅ Complete | 5-page Power BI replica: Executive Summary, Underwriting, Claims, Portfolio, Compliance |
| **Standalone Scorer** | ✅ Complete | Dark-mode page with detailed weighting model, mapping legend, reset/export |
| **Sample XML** | ✅ Complete | `sample-cognos-report.xml` — Life Insurance Underwriting Summary with 9 visuals, 2 queries, 4 prompts |

### 🔧 Stubbed / Partial

| Component | Status | What's Missing | Effort to Complete |
|-----------|--------|----------------|-------------------|
| **Validator — Row Count** | Stub | Compare Cognos vs PBI dataset row counts via XMLA endpoint | 16–24h |
| **Validator — Measure Values** | Stub | Spot-check calculated measure values across both systems | 8–12h |
| **Validator — Filter Parity** | Stub | Verify identical filter combinations return same row sets | 8–12h |
| **Validator — NULL Handling** | Stub | Test Cognos BLANK() vs PBI BLANK() behavior | 4–8h |
| **DAX Translation (AI-assisted)** | Partial | Regex patterns handle simple cases; complex actuarial/nested expressions need Claude API | 24–40h |
| **Frontend ↔ Backend Wiring** | Not built | Migrate tab is pure simulation. Needs FastAPI `/run-pipeline` endpoint | 8–12h |
| **Real XML Upload Processing** | Not built | Upload step reads file client-side only. Needs API to run Python pipeline | 8–12h |
| **.pbix File Generation** | Not built | Generate actual Power BI Desktop file from IR | 32–48h |
| **RLS + PIPEDA Masking** | Not built | Row-level security aligned to client's data access matrix | 16–24h |
| **Batch Processing** | Not built | Process 50+ reports in parallel | 16–24h |
| **Azure Deployment (IaC)** | Not built | Terraform/Bicep for client environment | 24–32h |
| **Tests** | None | No pytest, no unit tests, no CI/CD | 16–24h |
| **FastAPI Wrapper** | Not built | REST API for frontend to call pipeline stages | 8–12h |

---

## Remaining Work to Production

| Priority | Item | Effort | Why It Matters |
|----------|------|--------|---------------|
| 🟡 **Do First** | FastAPI wrapper + frontend wiring | 8–12h | Converts simulation into real pipeline execution |
| 🟡 **Do First** | Real XML upload → pipeline execution | 8–12h | User drops a file, gets real output |
| 🔴 **High** | `.pbix` file generation | 32–48h | Key client deliverable — tangible output |
| 🔴 **High** | RLS + PIPEDA masking | 16–24h | Required for production in Canadian life insurance |
| 🟡 **Medium** | Live validator (XMLA endpoint) | 16–24h | Highest-value production task — proves correctness |
| 🟡 **Medium** | Full DAX translation (Claude API) | 24–40h | Handles complex actuarial expressions regex can't touch |
| 🟡 **Medium** | Azure deployment (IaC) | 24–32h | Client needs Canada Central / Canada East regions |
| 🟡 **Medium** | Batch processing (50+ reports) | 16–24h | Scale from single report to portfolio migration |
| 🟢 **Lower** | Tests + CI/CD | 16–24h | pytest, GitHub Actions, code quality gates |

**Total: 168–256 developer hours to production** (excludes client environment setup, security review, and UAT)

---

## Architecture

### Pipeline Flow (Python)

```
Cognos XML Report
       ↓
  [extractor.py]      ← XPath parser (5 zones: metadata, queries, visuals, filters, prompts)
       ↓
  [ir_generator.py]   ← Canonical IR (normalized visuals, filters, calcs, fields)
       ↓
  [rule_engine.py]    ← Visual mapping (9 types → PBI) + DAX translation (8 patterns)
       ↓
  [complexity_scorer.py] ← Weighted scoring (0–100) + effort estimate (hours)
       ↓
  [validator.py]      ← 3 live checks + 4 stubs (row count, measures, filters, NULLs)
       ↓
  Output: migration_result.json + LifeInsurance_Measures_Generated.dax
```

### Frontend Flow (React)

```
Step 1: Upload    → Drag/drop XML or load demo report
Step 2: Extract   → Animated metadata extraction (simulated)
Step 3: Score     → Per-item complexity scoring with live gauge
Step 4: Migrate   → Animated pipeline simulation with JSON/DAX output
Step 5: Preview   → 5-page Power BI replica with life insurance data
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.11 (pipeline) / Bun + Hono (Zo Site server) |
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS 4 + inline styles (demo pages) |
| Charts | recharts (Preview tab) / CSS bar charts (Score tab) |
| Build | Vite (bundling) + Zo Site (hosting) |

---

## Folder Structure

```
cognos-migration-accelerator/
├── src/
│   ├── pages/
│   │   ├── cognos-demo.tsx      ← 5-step wizard (Upload→Extract→Score→Migrate→Preview)
│   │   └── complexity-scorer.tsx ← Standalone dark-mode scorer
│   ├── App.tsx                   ← Router: / and /scorer
│   └── ...
├── pipeline/
│   ├── pipeline/
│   │   ├── extractor.py          ← Stage 1: XPath Cognos XML parser
│   │   ├── ir_generator.py       ← Stage 2: Canonical IR generator
│   │   ├── rule_engine.py        ← Stage 3: Visual + DAX rule engine
│   │   ├── validator.py          ← Stage 4: 7-check QA validation (3 live, 4 stubs)
│   │   ├── complexity_scorer.py  ← Stage 5: Weighted complexity scorer
│   │   ├── main.py               ← Entry point: python main.py --xml <file> --output <file>
│   │   └── mock_cognos_report.xml ← Synthetic UW Summary report input
│   └── output/
│       ├── migration_result.json ← Generated by pipeline run
│       └── LifeInsurance_Measures_Generated.dax
├── sample-cognos-report.xml      ← Standalone sample XML for testing
├── server.ts                     ← Hono + Vite middleware (Zo Site)
├── index.html                    ← HTML entry point
├── package.json                  ← Dependencies (React, recharts, etc.)
└── zosite.json                   ← Zo deployment config
```

---

## Running the Python Pipeline

```bash
cd pipeline/pipeline
python3 main.py --xml mock_cognos_report.xml --output ../output/migration_result.json
```

Or use the sample file:

```bash
python3 main.py --xml ../../sample-cognos-report.xml --output ../output/migration_result.json
```

Output files appear in `pipeline/output/`.

---

## Running the Frontend (Local Dev)

```bash
bun run dev
```

The Zo Site dev server starts automatically. View in the Zo preview iframe.

---

## Regulatory Notes

- **OSFI B-20 / E-21:** Rule engine and scorer are models under OSFI definition. Governance documentation required before production use in underwriting decisions.
- **PIPEDA:** Pipeline IR contains field names only — no PII values. Azure deployment must use Canada Central or Canada East regions.
- **RLS:** Power BI output must implement row-level security aligned to the client's data access matrix.
- **Claude API:** If AI-assisted DAX translation is enabled, confirm client AI use policy and Anthropic data processing addendum.

---

## Key Extension Points

| File | How to Extend |
|------|---------------|
| `rule_engine.py` → `VISUAL_MAP` | Add new Cognos → Power BI visual type mappings |
| `rule_engine.py` → `DAX_PATTERNS` | Add new DAX translation patterns |
| `complexity_scorer.py` → `WEIGHTS` | Tune scoring weights against your report inventory |
| `validator.py` → `_check_row_count_stub()` | Replace stub with live XMLA endpoint call — highest-value production task |

---

## License

Internal POC — not licensed for external distribution.
