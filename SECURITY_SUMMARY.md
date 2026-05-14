# Security Summary — Cognos → Power BI Migration Accelerator

**Last Updated:** 2026-05-14  
**Version:** 1.0.0  
**Classification:** Internal POC — Not for external distribution

---

## Data Privacy: Zero Egress

This application processes **all data locally in the browser**. No data ever leaves the user's machine.

| Aspect | Behavior |
|--------|----------|
| **Report XML parsing** | Client-side JavaScript only. XML is never transmitted. |
| **DAX generation** | Pre-generated demo outputs shipped with the build. No API calls. |
| **Complexity scoring** | Computed in-browser using embedded weights and rules. |
| **Validation checks** | Stub implementations return pre-generated results. |
| **Demo Mode** | Default mode. Zero network requests after initial page load. |

**Production pipeline** (Python) runs entirely on-premises or within the client's Azure tenant. No data flows through third-party servers.

---

## No Telemetry

This application contains **zero telemetry, analytics, or tracking code**.

- No Google Analytics, no Mixpanel, no Segment
- No Application Insights or Azure Monitor agents
- No logging to external services
- No crash reporting to third parties
- No usage metrics collection

---

## Authentication

| Mode | Auth Required | Notes |
|------|---------------|-------|
| **Demo Mode (default)** | None | Runs entirely in-browser with pre-generated data |
| **Production** | Client-managed | API routes accept `Authorization: Bearer <token>`. Token managed via environment variable. |

The server checks for `AI_API_KEY` environment variable. If absent, it runs in Demo Mode (read-only, no external calls).

---

## Air-Gapped Readiness

The application can run in a fully disconnected environment:

```bash
# 1. Copy the project directory to air-gapped machine
# 2. Install dependencies (pre-downloaded or from local registry)
npm install --offline
# 3. Build and serve
npm run build
npx serve dist
```

- All demo data is embedded in the JavaScript bundle
- No CDN dependencies (fonts, scripts, styles are bundled)
- No runtime network requirements in Demo Mode

---

## Supply Chain

| Component | Source | Risk |
|-----------|--------|------|
| **React + Vite** | npm registry | Standard OSS — audited via `npm audit` |
| **Lucide React** | npm registry | Icon library — no data processing |
| **Tailwind CSS** | npm registry | CSS framework — no runtime JS |
| **Python pipeline** | Local Python 3.10+ | `requirements.txt` with standard library only + optional `fastapi`, `uvicorn` |

**Recommendation:** Run `npm audit` before production deployment. Pin all dependency versions.

---

## Deployment Considerations for Regulated Environments

1. **Canadian Data Residency**: Deploy to Azure Canada Central or Canada East region.
2. **Network Isolation**: The demo runs without internet. Production pipeline needs only XMLA endpoint access (internal).
3. **Secrets Management**: Store `AI_API_KEY` in Azure Key Vault or environment variable — never in source code.
4. **Row-Level Security (RLS)**: Power BI output must implement RLS aligned to the client's data access matrix.
5. **Audit Logging**: Production deployments should add application-level audit logs for pipeline executions.

---

## Contact

For security questions: `tattvamasea@gmail.com`  
Repository: https://github.com/tattvamasea-eng/cognos-migration-accelerator
