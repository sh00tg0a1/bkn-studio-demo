# BKN Studio

基于 KWeaver BKN 知识网络的**通用智能工作台框架** — 用户接入任意 BKN 知识网络，安装领域 Skill，通过自然语言对话与知识网络交互，生成分析报告和可视化 Artifact。

> **框架 vs 实例**: BKN Studio 本身是领域无关的。仓库中的 PMC 供应链技能（`.cursor/skills/pmc-*`）和 `ref/supply-dup-cx/` 只是**示例实例**，用于演示框架能力。用户可以接入自己的 BKN、安装自己的 Skill，服务完全不同的业务场景。

## Priority

User instructions > harness docs (`docs/`) > framework defaults.

## Tech stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript 5 (strict) |
| Agent SDK | Vercel AI SDK (`ai` + `@ai-sdk/anthropic`) |
| LLM | MiniMax (Anthropic-style API), configurable |
| UI | React 19, Tailwind CSS 4, shadcn/ui |
| Client state | `useChat` (chat) + SWR (workspace data) |
| Backend SDK | `@kweaver-ai/kweaver-sdk` CLI via `child_process` |
| Workspace storage | `~/.bkn-studio/<workspace-name>/` |
| Package manager | pnpm |

## Repo layout

| Path | Purpose |
|------|---------|
| `src/app/` | Next.js App Router pages & API routes |
| `src/components/` | React UI components |
| `src/lib/` | Shared utilities, KWeaver SDK wrappers, workspace manager |
| `src/types/` | Shared TypeScript types |
| `ref/` | BKN reference files, PRD documents (read-only) |
| `scripts/` | Data migration & utility scripts (Python) |
| `docs/` | Harness documentation → see below |

## Documentation index

| Doc | Purpose |
|-----|---------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | System diagram, module boundaries |
| [docs/DESIGN.md](docs/DESIGN.md) | Design philosophy |
| [docs/FRONTEND.md](docs/FRONTEND.md) | UI conventions, layout, a11y |
| [docs/PLANS.md](docs/PLANS.md) | Product roadmap phases |
| [docs/PRODUCT_SENSE.md](docs/PRODUCT_SENSE.md) | Personas and "what good looks like" |
| [docs/QUALITY_SCORE.md](docs/QUALITY_SCORE.md) | Quality scorecard |
| [docs/RELIABILITY.md](docs/RELIABILITY.md) | Runtime reliability expectations |
| [docs/SECURITY.md](docs/SECURITY.md) | Auth, secrets, audit |
| [docs/design-docs/index.md](docs/design-docs/index.md) | Design docs catalog |
| [docs/product-specs/index.md](docs/product-specs/index.md) | Domain specs catalog |
| [docs/exec-plans/](docs/exec-plans/) | Active & completed execution plans |

## Secrets & logging

- KWeaver credentials managed via `~/.kweaver/` — **never** commit tokens or passwords.
- `.env.local` for local dev overrides (`KWEAVER_BASE_URL`, `KWEAVER_TOKEN`) — **gitignored**.
- Never log `access_token`, `refresh_token`, or user credentials.

## Testing bar

- TypeCheck: `pnpm tsc --noEmit` must pass.
- Lint: `pnpm lint` (ESLint) must pass.
- Unit tests: Vitest for lib/ utilities.
- E2E: Playwright for critical user flows (workspace switch, chat, artifact render).

## BKN configuration

Studio instances are configured with a single BKN knowledge network `id`. All authentication and API calls go through `@kweaver-ai/kweaver-sdk`. See [docs/product-specs/bkn.md](docs/product-specs/bkn.md).

## Skill system

Skills are **pluggable domain logic modules**. The framework dynamically discovers and loads skills at runtime — no skills are hardcoded.

### How skills work

1. Skills are Markdown files (`SKILL.md`) with YAML frontmatter (`name`, `description`).
2. At agent startup, the framework scans a configurable skill directory → registers each as a tool.
3. The LLM selects which skill to invoke based on the `description` matching the user's question.
4. When invoked, the skill content is injected as reasoning guidance — data still comes from KWeaver tools.

### Skill sources

| Source | Path | Notes |
|--------|------|-------|
| Workspace skills | `~/.bkn-studio/<ws>/skills/` | Per-workspace, user-installed |
| Project Cursor skills | `<repo>/.cursor/skills/` | **Loaded into Studio agent prompt** after workspace; same layout; skipped if `skill_id` already in BKN or workspace |
| Agent home skills | `~/.agents/skills/` | **Loaded last** among file sources; same layout; skipped if `skill_id` already taken (BKN / workspace / project `.cursor/skills`) |

### Example skills (PMC demo)

The following skills are included as **examples only** — they demonstrate how domain skills bind to a BKN:

| Skill | Domain | Example KN |
|-------|--------|-----------|
| `pmc-shortage-analysis` | PMC 缺料分析 | supply-dup-cx |
| `pmc-delivery-risk` | PMC 交期分析 | supply-dup-cx |
| `pmc-producibility` | PMC 可生产分析 | supply-dup-cx |

## Reference materials (examples)

| Path | Content |
|------|---------|
| `ref/PMC智能问答系统_PRD_v1.0.md` | Example PRD (PMC domain) |
| `ref/supply-dup-cx/` | Example BKN definition files |
| `ref/skill.csv` | Example skill capability matrix |
| `scripts/` | Utility scripts for BKN data migration |
