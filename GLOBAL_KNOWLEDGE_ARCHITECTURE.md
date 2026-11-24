# Global Knowledge & Continuous Intelligence Architecture

## Purpose

MTDM AI Lab should learn from publicly accessible, reputable educational and technical resources worldwide, maintain a traceable knowledge catalogue, detect stale information, and recommend or stage improvements without depending on a paid MTDM-operated server.

This document defines intended architecture and safety boundaries. It does not claim automatic global crawling, live model discovery, or self-updating is already implemented.

## Design principles

1. **Public and permitted sources only.** Prefer official documentation, standards publishers, universities/open courses, public research repositories, government/scientific agencies, and maintained open-source documentation. Respect robots directives, terms, API policies, copyright, rate limits and licences. No paywall circumvention or prohibited scraping.
2. **Source provenance.** Record source title, canonical URL, publisher/author where available, publication/update date, retrieval timestamp, licence notes, topic tags and evidence summary. Preserve attribution; do not present source material as MTDM-authored.
3. **Freshness, not an impossible guarantee.** Track last-checked, last-verified, source update date and topic-specific review interval. Re-check fast-changing topics more frequently; flag stale, inaccessible, conflicting or unverified records. Never label information permanently current.
4. **Evidence before adoption.** Cross-check important claims against primary sources. Separate established facts, interpretation, simulation assumptions and unresolved claims. Safety-critical engineering requires datasheets, standards and deterministic calculations—not an LLM answer alone.
5. **Model-agnostic intelligence.** Maintain a provider/model registry with specialty, supported tasks, official endpoint/docs, access method, configured status, quota/rate-limit signals, data-handling terms and last health-check. Route by capability and evidence quality.
6. **Graceful free-tier fallback.** Use only providers/endpoints configured by the user or explicitly permitting anonymous access. Detect quota, outage and deprecation responses; fall back only to another already-authorized provider. Free tiers and availability can change. Never create accounts, accept terms or transmit private data without consent.
7. **GitHub-budget aware.** GitHub Pages remains a static frontend. Use scheduled Actions and public APIs sparingly, cache results, deduplicate unchanged content, use conditional requests where supported, cap runtime/concurrency and avoid frequent full crawls. Keep workflows manual/low-frequency until measured against current GitHub limits. GitHub is not an unlimited crawler, database or backend.
8. **Privacy by default.** Public knowledge collection must not collect visitor personal data. Never upload user projects, prompts, recordings, credentials or private files to an index/model provider by default. External model use must be opt-in and clearly identify provider and data sent. Never commit secrets to this public repository.
9. **Safe self-improvement.** AI may propose documentation, tests, code patches and research updates. It must not directly deploy arbitrary code, modify safety policy, alter permissions, access secrets or run unrestricted commands. Changes go through isolated branches, tests, dependency/security checks, human review, versioned releases and rollback.
10. **Transparent operation.** Do not hide source collection or external provider use. Show users which sources, timestamps, model/provider and update status informed a result. Protect private user data and secrets, but do not conceal provenance, collection practices or material limitations.

## Proposed components

- **Source Registry:** allowlisted domains, source type, licence/terms notes, retrieval method and review cadence.
- **Knowledge Index:** compact metadata and summaries with canonical citations; avoid republishing copyrighted source text.
- **Freshness Monitor:** conditional checks, date comparison, stale/conflict flags and visible last-verified timestamps.
- **Model Registry & Router:** provider capabilities, user-authorized credentials, health/quota status and specialty routing.
- **Research Agents:** electronics, IoT, AI, robotics, quantum, nanoscience, additive manufacturing and general research; evidence-linked findings.
- **Validation Gate:** schema/source checks, deterministic calculations, regression tests and security review.
- **Update Queue:** proposed changes with diffs, evidence and test results; explicit human approval before merge/deploy.
- **Audit & Rollback:** release history, provenance records and documented revert path.

## Suggested operating cycle

1. Discover candidates from approved registries and official APIs.
2. Check permission, licence, source quality and rate limits before retrieval.
3. Fetch only changed material; normalize metadata and record provenance.
4. Summarize and cross-check claims; mark uncertainty and conflicting evidence.
5. Run freshness checks and flag stale entries.
6. Let specialist agents propose improvements with citations and tests.
7. Validate in isolation; require human approval for repository changes and releases.
8. Publish a versioned update and retain rollback capability.

## Phased implementation

- **Phase 0 — policy and inventory:** source policy, provider registry schema, privacy boundary and resource budget.
- **Phase 1 — read-only knowledge catalogue:** curated sources, metadata, citations and manual refresh; no autonomous crawling.
- **Phase 2 — freshness automation:** low-frequency scheduled checks of approved sources, caching and quota-aware limits.
- **Phase 3 — optional model router:** user-configured providers and local-model support, with explicit per-request data consent.
- **Phase 4 — controlled improvement proposals:** evidence-backed pull requests, automated validation and human approval.

## Non-goals

No promise of exhaustive internet coverage, permanent freshness, unlimited free inference, hidden data collection, automatic account creation, autonomous merging/deployment, or replacement of qualified engineering/scientific review.
