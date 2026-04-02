# Architecture — BKN Studio (Framework)

## System overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                              │
│                                                             │
│  ┌──────────────┐  ┌──────────────────────────────────────┐ │
│  │  Sidebar      │  │  Chat Panel                         │ │
│  │              │  │                                      │ │
│  │ ┌──────────┐ │  │  Messages + Streaming response       │ │
│  │ │Workspace │ │  │                                      │ │
│  │ │Switcher  │ │  │  ┌──────────────────────────────┐    │ │
│  │ └──────────┘ │  │  │ Artifact Renderer            │    │ │
│  │ ┌──────────┐ │  │  │ (HTML / Markdown / Charts)   │    │ │
│  │ │Resources │ │  │  └──────────────────────────────┘    │ │
│  │ │(uploads) │ │  │                                      │ │
│  │ └──────────┘ │  └──────────────────────────────────────┘ │
│  │ ┌──────────┐ │                                           │
│  │ │Artifacts │ │                                           │
│  │ │(outputs) │ │                                           │
│  │ └──────────┘ │                                           │
│  └──────────────┘                                           │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTP (Next.js API routes)
┌────────────────────▼────────────────────────────────────────┐
│                   Next.js Server                            │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  API Routes  /api/                                    │   │
│  │  ├─ /api/chat             → Agent conversation (SSE)  │   │
│  │  ├─ /api/workspace/**     → CRUD workspace            │   │
│  │  ├─ /api/workspace/[n]/resources  → Upload/list files │   │
│  │  ├─ /api/workspace/[n]/artifacts  → List/read outputs │   │
│  │  ├─ /api/workspace/[n]/conversations → Chat history   │   │
│  │  └─ /api/bkn              → List available BKN        │   │
│  └──────────────────────────────────────────────────────┘   │
│                          │                                   │
│  ┌───────────────────────▼──────────────────────────────┐   │
│  │  lib/agent.ts — Vercel AI SDK streamText loop          │   │
│  │  lib/skills.ts — scan workspace skills/ → sys prompt   │   │
│  │  lib/kweaver.ts — SDK wrapper (child_process)          │   │
│  │  lib/workspace.ts — ~/.bkn-studio/ file manager       │   │
│  │  lib/conversations.ts — chat persistence               │   │
│  └───────────────────────┬──────────────────────────────┘   │
└──────────────────────────┼──────────────────────────────────┘
                           │ HTTPS
┌──────────────────────────▼──────────────────────────────────┐
│              KWeaver Platform (remote)                       │
│  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────────────┐    │
│  │  Auth   │  │  BKN   │  │ Agent  │  │ Data Sources   │    │
│  └────────┘  └────────┘  └────────┘  └────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## Agent layer

```
┌────────────────────────────────────────────────────────┐
│  /api/chat (Route Handler)                             │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Agent Loop (src/lib/agent.ts)                    │  │
│  │                                                    │  │
│  │  System prompt + workspace context                 │  │
│  │       ↓                                            │  │
│  │  LLM (OpenAI-compatible) ←→ Tool calls             │  │
│  │       ↓                                            │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │  │
│  │  │ KWeaver  │  │Workspace │  │ Skill Tools      │ │  │
│  │  │ Tools    │  │ Tools    │  │ (dynamically     │ │  │
│  │  │          │  │          │  │  discovered from │ │  │
│  │  │ • query  │  │ • read   │  │  workspace &     │ │  │
│  │  │ • search │  │   resource│  │  global dirs)    │ │  │
│  │  │ • schema │  │ • write  │  │                  │ │  │
│  │  │ • action │  │   artifact│  │ • user-installed │ │  │
│  │  │          │  │          │  │   domain skills  │ │  │
│  │  └──────────┘  └──────────┘  └──────────────────┘ │  │
│  └──────────────────────────────────────────────────┘  │
│       ↓ SSE stream                                     │
│  Response tokens → Client                              │
└────────────────────────────────────────────────────────┘
```

## Module boundaries

| Module | Responsibility | Allowed dependencies |
|--------|---------------|---------------------|
| `src/app/` | Routing, page composition, API handlers | components, lib, types |
| `src/components/` | Presentational & interactive UI | lib (read-only), types |
| `src/lib/agent.ts` | Agent loop: Vercel AI SDK `streamText` ↔ tool dispatch ↔ SSE | kweaver, workspace, skills, types |
| `src/lib/skills.ts` | Skill loader: scan workspace `skills/` → parse frontmatter → build system prompt section | Node.js `fs`, types |
| `src/lib/conversations.ts` | Chat persistence: read/write conversation JSON files | Node.js `fs`, types |
| `src/lib/kweaver.ts` | KWeaver SDK wrapper (auth, BKN query, agent chat) | `@kweaver-ai/kweaver-sdk`, types |
| `src/lib/workspace.ts` | Local filesystem workspace CRUD (`~/.bkn-studio/`) | Node.js `fs`, `path`, types |
| `src/types/` | Shared interfaces & type definitions | (none) |

## Dependency direction

```
pages/routes → components → lib → SDK / fs
                ↘ types ↙

lib internal:
  agent → kweaver (SDK calls)
       → workspace (file I/O)
       → skills (tool definitions)
```

Strict unidirectional: pages import components; components import lib utilities; lib talks to external SDK and filesystem. No reverse imports. Within `lib/`, the agent module orchestrates other modules but they do not depend on agent.

## Workspace storage layout

```
~/.bkn-studio/
  ├─ workspaces.json              # redundant index for fast listing
  └─ <workspace-name>/
      ├─ config.json              # { name, bknId, createdAt, updatedAt }
      ├─ skills/                   # user-installed domain skills
      │   └─ <skill-name>/SKILL.md
      ├─ resources/                # user-uploaded files
      ├─ conversations/            # persisted chat history
      │   ├─ index.json
      │   └─ conv-<ts>.json
      ├─ intermediate/             # process files (hidden from UI)
      └─ artifacts/                # generated HTML, docs, charts
```

## Key design decisions

- **Single BKN config**: each workspace binds to one BKN `id`; switching BKN = switching workspace.
- **SDK-first**: all KWeaver API calls go through `@kweaver-ai/kweaver-sdk` — no raw HTTP.
- **Server-side file I/O**: workspace files read/written via Next.js API routes (server-only); client never touches filesystem directly.
- **Streaming chat**: Agent responses streamed via Server-Sent Events for real-time UX.

## Related docs

- [docs/DESIGN.md](docs/DESIGN.md) — design philosophy
- [docs/FRONTEND.md](docs/FRONTEND.md) — UI conventions & layout spec
- [docs/product-specs/index.md](docs/product-specs/index.md) — domain behavior specs
- [docs/design-docs/index.md](docs/design-docs/index.md) — engineering design docs
