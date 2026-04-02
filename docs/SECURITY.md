# Security

## Authentication

- All KWeaver auth managed via `@kweaver-ai/kweaver-sdk` and `~/.kweaver/` credentials store.
- Studio does **not** store user passwords — SDK handles OAuth2 refresh flow.
- `.env.local` may hold `KWEAVER_BASE_URL` and `KWEAVER_TOKEN` for local dev — **must be gitignored**.

## Secrets handling

- **Never** log `access_token`, `refresh_token`, or API keys.
- **Never** include credentials in client-side bundles.
- Optional MySQL for the Skill registry (`SKILLS_DB_*` in server env only): same rules as DB passwords elsewhere — not in repo, not in client bundles.
- API routes proxy all KWeaver calls server-side; tokens never reach the browser.

## Workspace data

- Workspace files stored at `~/.bkn-studio/` — local to the user's machine.
- Uploaded resources may contain sensitive business data; treat as confidential.
- No workspace data is sent to external services except through explicit KWeaver SDK calls.

## Audit

- Log BKN query actions (object type, timestamp) server-side for traceability.
- Do not log query result payloads (may contain PII or business-sensitive data).
