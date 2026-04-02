# BKN Studio — MVP Design Spec

Date: 2026-04-02

## Overview

BKN Studio is a domain-agnostic framework that connects to any KWeaver BKN knowledge network. Users install domain-specific skills, ask questions via natural language chat, and receive streamed answers with generated artifacts (HTML reports, Markdown documents, charts).

The framework provides workspace isolation, skill loading, agent orchestration, and artifact management. Domain intelligence comes entirely from user-installed skills.

## Decision Log

| Decision | MVP Choice | Future |
|----------|-----------|--------|
| Skill installation | Filesystem (`~/.bkn-studio/<ws>/skills/`) | UI upload + skill marketplace |
| LLM backend | MiniMax (Anthropic-style API) | KWeaver Agent API + configurable LLM |
| Chat persistence | Persist to workspace `conversations/` | — |
| Artifact trigger | Agent auto-judge + user manual "保存为成果" | — |
| KWeaver invocation | Shell out to CLI (`child_process.execFile`) | SDK programmatic API |
| Authentication | Pre-logged-in via `kweaver auth login` | In-app login flow |
| BKN selection | Pull list from platform (`kweaver bkn list`) | — |
| Skill loading mode | System prompt injection (Mode B) | Embedding retrieval for many skills |
| Agent framework | Vercel AI SDK (`ai` + `@ai-sdk/anthropic`) | — |

## Architecture

```
Browser
┌──────────────┬───────────────────────────────────┐
│  Sidebar     │  Main Panel                       │
│  280px       │                                   │
│  ┌────────┐  │  ┌─────────────────────────────┐  │
│  │工作区   │  │  │ Chat / Artifact Preview     │  │
│  │切换     │  │  │                             │  │
│  ├────────┤  │  │ [streaming messages]         │  │
│  │技能     │  │  │ [artifact cards inline]     │  │
│  ├────────┤  │  │                             │  │
│  │资源     │  │  │ [input + send]              │  │
│  ├────────┤  │  └─────────────────────────────┘  │
│  │成果     │  │                                   │
│  └────────┘  │                                   │
└──────────────┴───────────────────────────────────┘
       │ SWR                    │ useChat (AI SDK)
       ▼                       ▼
Next.js Server (App Router)
┌──────────────────────────────────────────────────┐
│  /api/chat         → lib/agent.ts (streamText)   │
│  /api/workspace/** → lib/workspace.ts (fs CRUD)  │
│  /api/bkn/**       → lib/kweaver.ts (CLI exec)   │
│                                                   │
│  lib/skills.ts     → scan + parse SKILL.md        │
│  lib/conversations.ts → read/write chat history   │
└──────────────────────┬────────────────────────────┘
                       │ child_process: kweaver <cmd>
                       ▼
             KWeaver Platform (remote)
```

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript 5 (strict) |
| Agent SDK | Vercel AI SDK (`ai` + `@ai-sdk/anthropic`) |
| LLM | MiniMax via Anthropic-compatible API |
| UI | React 19 + shadcn/ui + Tailwind CSS 4 |
| Client state | `useChat` (chat) + SWR (workspace data) |
| KWeaver | `@kweaver-ai/kweaver-sdk` CLI via `child_process` |
| Package manager | pnpm |

## Agent Loop

### Flow

```
POST /api/chat { workspaceName, conversationId, message }
  1. Read workspace config → bknId
  2. Scan skills/ → parse YAML frontmatter → build skill content
  3. Load conversation history from conversations/<id>.json
  4. Build system prompt (inject all workspace skills as domain knowledge)
  5. streamText({
       model: anthropic('minimax-model', { baseURL: LLM_API_BASE }),
       system: systemPrompt,
       messages: [...history, ...newMessages],
       tools: { bkn_query, bkn_search, bkn_schema,
                read_resource, list_resources,
                write_artifact, list_artifacts },
       maxSteps: 10,
       onFinish: persist conversation
     })
  6. Return SSE stream
```

### Skill Loading (Mode B — System Prompt Injection)

Skills are injected into the system prompt, not registered as tools:

1. Scan `~/.bkn-studio/<ws>/skills/*/SKILL.md`
2. Parse YAML frontmatter (`name`, `description`)
3. Concatenate full skill content into system prompt under "已加载的领域知识" section
4. LLM receives domain reasoning rules as context, uses KWeaver tools to fetch real data

MVP: inject all workspace skills (few expected). Future: semantic retrieval for large skill sets.

### System Prompt Structure

```
你是 BKN Studio 的智能助手，帮助用户通过知识网络获取信息和生成分析。

当前工作区: {workspace.name}
绑定知识网络: {workspace.bknId}
可用资源: {resourceList}

已加载的领域知识:
---
## Skill: {skill1.name}
{skill1.content}
---
## Skill: {skill2.name}
{skill2.content}
---

规则:
- 所有数据必须来自知识网络查询，禁止编造数据
- 引用数据时标注来源 (KN + OT + 实例键)
- 生成报告或分析结果时，调用 write_artifact 工具保存
- 遇到领域问题时，参考已加载的领域知识中的推理规则
```

### Tools (data I/O only)

| Tool | Parameters | Action |
|------|-----------|--------|
| `bkn_query` | objectType, condition?, limit | `kweaver bkn object-type query <bknId> <type> '<json>'` |
| `bkn_search` | query | `kweaver bkn search <bknId> -q "<query>"` |
| `bkn_schema` | — | `kweaver bkn object-type list <bknId>` |
| `bkn_action` | actionName, params | `kweaver bkn action execute <bknId> --action <name> --params '<json>'` (requires user confirmation) |
| `read_resource` | filename | Read file from workspace `resources/` |
| `list_resources` | — | List files in workspace `resources/` |
| `write_artifact` | filename, content | Write file to workspace `artifacts/` |
| `list_artifacts` | — | List files in workspace `artifacts/` |

### LLM Configuration

| Setting | Default | Env var |
|---------|---------|---------|
| API endpoint | — | `LLM_API_BASE` |
| Model | — | `LLM_MODEL` |
| API key | — | `LLM_API_KEY` |
| Temperature | 0.3 | — |
| Max tokens | 4096 | — |

## Workspace Storage

```
~/.bkn-studio/
├─ workspaces.json                    # redundant index for fast listing
└─ <workspace-name>/
    ├─ config.json                    # { name, bknId, createdAt, updatedAt }
    ├─ skills/                        # user-installed domain skills
    │   └─ <skill-name>/SKILL.md
    ├─ resources/                     # user-uploaded files
    ├─ conversations/
    │   ├─ index.json                 # [{ id, title, createdAt, updatedAt }]
    │   └─ conv-<timestamp>.json      # { id, title, messages: [...] }
    ├─ intermediate/                  # agent process files (hidden)
    └─ artifacts/                     # generated outputs (visible)
```

### Conversation format

Messages stored in Anthropic format (preserving tool_use/tool_result blocks). Loaded and passed directly to LLM on resume.

Title auto-generated: after the first assistant response completes (`onFinish`), a lightweight LLM call extracts a ≤10 character Chinese summary from the first user message. On failure, fallback to truncated first message. Runs async — does not block the chat response.

## API Routes

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/workspace` | GET | List all workspaces |
| `/api/workspace` | POST | Create workspace (name + bknId) |
| `/api/workspace/[name]` | GET | Get workspace details |
| `/api/workspace/[name]` | DELETE | Delete workspace |
| `/api/workspace/[name]/resources` | GET | List resources |
| `/api/workspace/[name]/resources` | POST | Upload resource (multipart) |
| `/api/workspace/[name]/resources/[file]` | DELETE | Delete resource |
| `/api/workspace/[name]/conversations` | GET | List conversations |
| `/api/workspace/[name]/conversations` | POST | New conversation |
| `/api/workspace/[name]/conversations/[id]` | GET | Get conversation messages |
| `/api/workspace/[name]/artifacts` | GET | List artifacts |
| `/api/workspace/[name]/artifacts/[file]` | GET | Read artifact content |
| `/api/workspace/[name]/artifacts/[file]` | DELETE | Delete artifact |
| `/api/chat` | POST | Chat (SSE stream) |
| `/api/bkn` | GET | List available BKN networks |

## Frontend Components

### File structure

```
src/
├─ app/
│   ├─ layout.tsx                     # root layout + providers
│   ├─ page.tsx                       # "/" redirect
│   ├─ workspace/[name]/
│   │   ├─ layout.tsx                 # WorkspaceProvider
│   │   └─ page.tsx                   # Sidebar + MainPanel
│   └─ api/...                        # route handlers
├─ components/
│   ├─ sidebar/
│   │   ├─ Sidebar.tsx
│   │   ├─ WorkspaceSwitcher.tsx
│   │   ├─ SkillList.tsx
│   │   ├─ ResourceList.tsx
│   │   └─ ArtifactList.tsx
│   ├─ chat/
│   │   ├─ ChatPanel.tsx
│   │   ├─ MessageList.tsx
│   │   ├─ MessageBubble.tsx
│   │   ├─ ToolCallIndicator.tsx
│   │   ├─ ArtifactCard.tsx
│   │   ├─ ChatInput.tsx
│   │   └─ ConversationList.tsx
│   ├─ artifact/
│   │   ├─ ArtifactPreview.tsx
│   │   ├─ HtmlRenderer.tsx
│   │   ├─ MarkdownRenderer.tsx
│   │   └─ CodeRenderer.tsx
│   ├─ workspace/
│   │   ├─ CreateWorkspaceDialog.tsx
│   │   └─ DeleteWorkspaceDialog.tsx
│   └─ ui/                           # shadcn/ui primitives
├─ lib/
│   ├─ agent.ts
│   ├─ skills.ts
│   ├─ kweaver.ts
│   ├─ workspace.ts
│   └─ conversations.ts
└─ types/
    ├─ workspace.ts
    ├─ conversation.ts
    └─ skill.ts
```

### Interaction patterns

| Interaction | Behavior |
|-------------|----------|
| Sidebar collapse | Drag edge or toggle button; collapsed = icon-only |
| Workspace switch | Dropdown in sidebar → route change `/workspace/[name]` |
| Conversation switch | Panel header shows current title; click to expand list |
| New conversation | Button in conversation list → creates `conv-{ts}.json` |
| Resource upload | Drag-and-drop or file picker in ResourceList |
| Artifact preview | Slide-in overlay from right, occupies full MainPanel |
| Artifact from chat | Inline card in message stream: filename + 预览/下载 buttons |
| Manual save as artifact | User clicks "保存为成果" on any message content |
| Tool call display | Collapsible card in message stream: "正在查询..." → expand for details |
| Empty state | Centered guidance text + example question buttons |
| Streaming | Progressive markdown render via `useChat`; typing indicator during tool calls |

### Artifact rendering

| File type | Renderer |
|-----------|----------|
| `.html` | Sandboxed iframe (HtmlRenderer) |
| `.md` | react-markdown (MarkdownRenderer) |
| `.js/.ts/.py/.sql` | Syntax highlight via shiki (CodeRenderer) |
| `.txt/.csv` | Preformatted text |
| `.json` | Collapsible JSON tree |
| Other | Download link only |

## UI Quality

Implementation will follow `ui-ux-pro-max` skill guidelines (see [docs/FRONTEND.md](../FRONTEND.md) for in-repo checklist):

- Accessibility: contrast 4.5:1, keyboard nav, ARIA labels, focus rings
- Touch targets: min 44×44px
- Animation: 150–300ms with ease-out, respect `prefers-reduced-motion`
- Loading states: skeleton/shimmer for >300ms operations
- Error recovery: clear message + retry action
- Empty states: guidance text + example question buttons
- Design system: generate via `ui-ux-pro-max --design-system` before coding UI components

## Non-functional Requirements

| Requirement | Target |
|-------------|--------|
| First load JS | < 200 KB |
| Chat first token | < 2s (excluding LLM latency) |
| Workspace switch | < 500ms |
| TypeScript | strict mode |
| Linting | ESLint (next lint) zero errors |
