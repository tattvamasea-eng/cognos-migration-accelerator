/**
 * Cognos → Power BI Migration Accelerator — Standalone Server
 * 
 * Serves the Vite-built React app + Hono API routes for pipeline stages.
 * Demo Mode: returns pre-generated outputs when no API key is configured.
 * 
 * Run: bun run server/index.ts
 * Build: cd .. && bun run build  (then serve from ../dist/)
 */

import { Hono } from "hono";
import { serveStatic } from "hono/bun";

const app = new Hono();

// ── Pre-generated demo outputs (same data the UI uses in demo mode) ──
const DEMO_OUTPUTS = {
  extract: { visuals: 9, queries: 2, filters: 3, prompts: 4, data_fields: 21 },
  analyze: { band: "Medium", score: 52, risk: "Medium", effort: "16–48 hours (recommended: 32)" },
  convert: { visuals_mapped: "9/9", measures: 8, auto: 6, review: 2 },
  review: { passed: 1, warned: 2, stubbed: 4 },
};

// ── Demo Mode middleware ──
const isDemoMode = !process.env.AI_API_KEY;

app.use("*", async (c, next) => {
  c.header("X-Demo-Mode", isDemoMode ? "true" : "false");
  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Frame-Options", "DENY");
  await next();
});

// ── Health check ──
app.get("/api/health", (c) => c.json({ status: "ok", demo_mode: isDemoMode }));

// ── Pipeline API routes ──
app.post("/api/pipeline/extract", async (c) => {
  if (isDemoMode) return c.json({ ...DEMO_OUTPUTS.extract, source: "demo" });
  // Production: call Python extractor.py
  return c.json({ error: "Live pipeline not configured" }, 501);
});

app.post("/api/pipeline/analyze", async (c) => {
  if (isDemoMode) return c.json({ ...DEMO_OUTPUTS.analyze, source: "demo" });
  return c.json({ error: "Live pipeline not configured" }, 501);
});

app.post("/api/pipeline/convert", async (c) => {
  if (isDemoMode) return c.json({ ...DEMO_OUTPUTS.convert, source: "demo" });
  return c.json({ error: "Live pipeline not configured" }, 501);
});

app.post("/api/pipeline/review", async (c) => {
  if (isDemoMode) return c.json({ ...DEMO_OUTPUTS.review, source: "demo" });
  return c.json({ error: "Live pipeline not configured" }, 501);
});

app.post("/api/pipeline/run", async (c) => {
  // Full pipeline run — all 4 agents in sequence
  if (isDemoMode) {
    return c.json({
      pipeline_version: "1.0.0",
      source: "demo",
      agents: [
        { name: "gatherer", status: "complete", duration_ms: 120, ...DEMO_OUTPUTS.extract },
        { name: "analyzer", status: "complete", duration_ms: 45, ...DEMO_OUTPUTS.analyze },
        { name: "converter", status: "complete", duration_ms: 210, ...DEMO_OUTPUTS.convert },
        { name: "reviewer", status: "warn", duration_ms: 85, ...DEMO_OUTPUTS.review },
      ],
    });
  }
  return c.json({ error: "Live pipeline not configured" }, 501);
});

// ── Serve built React app ──
app.get("/*", serveStatic({ root: "./dist" }));
app.get("/*", serveStatic({ root: "./dist/index.html" }));

export default { port: 5175, fetch: app.fetch };
console.log(`🚀 Cognos → PBI Migration Accelerator running on http://localhost:5175`);
console.log(`   Demo Mode: ${isDemoMode ? "ON (no API key needed)" : "OFF (API key configured)"}`);
