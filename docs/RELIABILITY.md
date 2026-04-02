# Reliability

## Timeouts

| Operation | Timeout | Notes |
|-----------|---------|-------|
| KWeaver API calls | 30 s | SDK default; override per-call if needed |
| Agent chat streaming | 120 s | Long-running; use SSE keepalive |
| File upload | 60 s | Max 50 MB per file |
| Workspace FS operations | 5 s | Local disk; should be near-instant |

## Retries

- KWeaver SDK calls: retry up to 2× on transient failures (5xx, network timeout). **Idempotent reads only** — never auto-retry mutations.
- Token refresh: handled automatically by SDK; if refresh fails, surface re-login prompt to user.

## Idempotency

- Workspace creation: check existence before `mkdir`; return existing workspace if name matches.
- Artifact save: overwrite by name; append timestamp suffix if conflict-free history needed.

## Observability

- Server-side: structured JSON logs via `console.log` / `pino` (future).
- Client-side: error boundaries with user-friendly fallback UI.
- KWeaver SDK errors surfaced as typed error objects in chat panel.
