# MTDM Autonomous Research & Invention Engine (MARIE)

MARIE is an LLM-independent, read-only research metadata monitor and deterministic hypothesis-ranking engine. It is an internal engineering capability; it does not add a public Knowledge Hub interface.

## What is implemented

- A versioned, reviewed source registry containing fixed GitHub release repositories and Crossref bibliographic queries.
- HTTPS-only requests to an explicit host allowlist; redirects are rejected.
- Bounded request timeouts, response-size limits, per-source pacing and result caps.
- Metadata normalization, URL validation, stable identifiers and duplicate removal.
- Provenance fields: source ID/type, publisher, canonical URL and retrieval timestamp.
- Deterministic cross-domain hypothesis templates with explicit priority scores and validation plans.
- JSON and Markdown research reports, including errors and limitations.
- A GitHub Actions scheduled/manual workflow that stores reports as short-lived workflow artifacts.
- Automated tests for registry validation, URL safety, deduplication and hypothesis constraints.

## Run locally

Requires Node.js 22+; no third-party package is needed for MARIE itself.

```bash
npm run marie:test
npm run marie:run
```

Reports are written to `artifacts/marie/`. The runner uses public GitHub Releases and Crossref APIs. It does not download full papers, scrape websites, authenticate, access private repositories, execute retrieved content, or send user data.

## Automation

GitHub Actions runs weekly and can be started manually from the Actions tab. Each run produces `research-report.json` and `research-report.md` as workflow artifacts retained for 14 days. GitHub Pages is static; this workflow is not a continuously running server or permanent database. No commit or deployment is performed by the research workflow.

## Research and invention limits

The engine can monitor selected public metadata and generate structured cross-domain hypotheses. It does not understand or validate the full contents of papers, prove novelty, establish patentability, perform engineering certification, or autonomously invent working products. Priority scores are deterministic heuristics, not probabilities or scientific truth.

## Safety and governance

- Treat all remote metadata as untrusted text.
- Never execute downloaded content or generated hypotheses.
- No credentials, secrets, user uploads, telemetry or private project data are transmitted.
- No autonomous repository writes, merges, deployments, policy changes or permission changes.
- Check original source terms and licenses before reuse; metadata license status is deliberately marked unassessed.
- Safety-critical, biological, medical and physical-system work requires specialist review and independent validation.

See [RESEARCH_SAFETY.md](./RESEARCH_SAFETY.md) and [GLOBAL_KNOWLEDGE_ARCHITECTURE.md](./GLOBAL_KNOWLEDGE_ARCHITECTURE.md) for project-wide boundaries.
