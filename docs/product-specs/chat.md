# Chat & Agent

## Goal

Provide a conversational interface where users ask questions in natural language and receive answers grounded in BKN knowledge network data, with the ability to generate and persist artifacts.

## Agent architecture

Full detail: [design-docs/agent-architecture.md](../design-docs/agent-architecture.md) | MVP spec: [design-docs/2026-04-02-bkn-studio-design.md](../design-docs/2026-04-02-bkn-studio-design.md)

### Current: local lightweight agent (Vercel AI SDK)

- Agent loop via Vercel AI SDK `streamText()` in Next.js API route (`/api/chat`).
- Loop: LLM call → if tool_call, execute → append result → re-enter loop → if content, stream via SSE.
- Max 10 steps per request (`maxSteps: 10`).
- LLM backend: MiniMax (Anthropic-style API), configurable via `LLM_API_BASE`, `LLM_MODEL`, `LLM_API_KEY`.
- **Tools** (data I/O operations):
  1. **KWeaver tools** (`bkn_query`, `bkn_search`, `bkn_schema`, `bkn_action`) — shell out to `kweaver` CLI, parse JSON.
  2. **Workspace tools** (`read_resource`, `list_resources`, `write_artifact`, `list_artifacts`) — local filesystem via `fs`.
- **Skills are NOT tools** — they are injected into the system prompt as domain reasoning guidance (Mode B: system prompt injection). See below.

### Skill loading — Mode B (System Prompt Injection)

Skills are **not** registered as tools. Instead, they are injected into the system prompt as domain knowledge:

1. Before each LLM request, scan workspace `skills/`: `~/.bkn-studio/<ws>/skills/*/SKILL.md`
2. Parse YAML frontmatter (`name`, `description`) + read full Markdown content.
3. Concatenate all skill contents into the system prompt under "已加载的领域知识" section.
4. The LLM receives domain reasoning rules as context and uses KWeaver tools to fetch real data.

Skills guide **how** the agent reasons; tools provide **what** data to reason over.

**No skills are hardcoded** into the framework. Users install/remove skills at any time; changes take effect on the next chat request. MVP injects all workspace skills (few expected); future: semantic retrieval for large skill sets.

### Future: KWeaver Agent API

- Delegate to a KWeaver-hosted Agent (`kweaver agent chat <id> -m "..."`).
- Local agent becomes a thin proxy that forwards messages and streams responses.
- Skills would be configured in KWeaver Agent, not loaded locally.

## User-visible behavior

### Message flow

1. User types question in chat input (Chinese or English).
2. Client sends `POST /api/chat` with message + workspace context.
3. Server-side agent:
   a. Determines which tools to call based on the question.
   b. Calls KWeaver SDK / reads resources / invokes skills.
   c. Streams response tokens via SSE.
4. Client renders streamed Markdown response.
5. If agent generates an artifact (HTML, report), it is saved to `artifacts/` and shown inline.

### Streaming

- Server-Sent Events (SSE) for real-time token delivery.
- Client shows typing indicator during tool calls.
- Partial Markdown rendered progressively.

### Artifact generation

- When the agent produces structured output (HTML, Markdown doc, chart), it:
  1. Writes the file to `~/.bkn-studio/<ws>/artifacts/<filename>`.
  2. Returns an artifact reference in the chat response.
  3. Client renders the artifact inline with a "打开" / "下载" action.

### Skill management

- Skills are Markdown files with YAML frontmatter (`name`, `description`) + structured reasoning rules.
- Installed by placing `SKILL.md` files in workspace `skills/` directory (MVP: filesystem only; future: UI upload + marketplace).
- Workspace `resources/` files are **not** skills — they are data files the agent can read via the `read_resource` tool.
- **Framework is domain-agnostic**: it loads whatever skills the user has installed. No skills are built-in.

## Edge cases

- KWeaver SDK timeout → show error in chat, allow retry.
- Streaming connection drop → reconnect and show "连接中断" message.
- Empty BKN (no data) → agent responds with guidance on how to populate.
