# Agent Architecture

> Canonical MVP spec: [2026-04-02-bkn-studio-design.md](2026-04-02-bkn-studio-design.md)

## Overview

BKN Studio runs a lightweight server-side agent (Vercel AI SDK `streamText`) that interprets user questions, calls tools (KWeaver SDK, workspace I/O), and streams answers back. Domain knowledge comes from skills injected into the system prompt (Mode B), not from tool calls.

## Agent loop

```
User message
     ↓
System prompt (workspace context + all skill contents injected)
     ↓
┌──────────────────────────────────┐
│  LLM call (Anthropic-style API)       │
│  model: MiniMax (configurable)        │
│  stream: true                         │
└────────────┬─────────────────────┘
             │
     ┌───────▼───────┐
     │ Response type? │
     └───────┬───────┘
             │
     ┌───────┼───────────────┐
     │       │               │
  content  tool_call    finish
     │       │               │
  stream   execute tool   end loop
  tokens   → append result
     │       → re-enter loop
     ↓
  Client (SSE)
```

The loop runs until `finish_reason === "stop"` or max iterations (10) reached.

## Tool categories

### 1. KWeaver tools

Wrap `@kweaver-ai/kweaver-sdk` CLI commands as callable functions:

| Tool name | SDK command | Purpose |
|-----------|------------|---------|
| `bkn_query` | `kweaver bkn object-type query` | Query object instances with conditions |
| `bkn_search` | `kweaver bkn search` | Semantic search across KN |
| `bkn_schema` | `kweaver bkn object-type list` | List object types and fields |
| `bkn_action` | `kweaver bkn action execute` | Execute a BKN action (with confirmation) |

Implementation: shell out to `kweaver` CLI via `child_process.execFile`, parse JSON stdout. Alternatively, use SDK programmatic API if available.

### 2. Workspace tools

| Tool name | Operation | Purpose |
|-----------|----------|---------|
| `read_resource` | `fs.readFile` from `resources/` | Read user-uploaded file content |
| `list_resources` | `fs.readdir` on `resources/` | List available resources |
| `write_artifact` | `fs.writeFile` to `artifacts/` | Save generated output |
| `list_artifacts` | `fs.readdir` on `artifacts/` | List existing artifacts |

### 3. Skill tools (pluggable, domain-agnostic)

Skills are dynamically discovered — **the framework has zero hardcoded skills**. Users install domain-specific reasoning instructions into their workspace.

**Discovery sources** (in priority order):
1. Workspace skills: `~/.bkn-studio/<ws>/skills/*/SKILL.md`
2. Global skills: configurable directory (e.g. `.cursor/skills/`)

**Loading mechanism**: per chat request, scan skill directories → find `SKILL.md` files → parse YAML frontmatter for `name` and `description` → register as LLM tools. The LLM decides when to invoke based on the `description` matching user intent.

**Skill ≠ tool call in the traditional sense**: when the LLM "calls" a skill tool, the agent injects the skill's full Markdown content into the conversation as a system message, then continues the loop. The skill acts as **reasoning guidance**, not a function that returns data. The data comes from KWeaver tools.

**Example** (PMC demo — not built into framework):

| Installed skill | Description | The LLM invokes when user asks about... |
|----------------|-------------|----------------------------------------|
| `pmc-shortage-analysis` | 缺料分析、齐套率、MRP | "缺什么料？" |
| `pmc-delivery-risk` | 交期、卡点、风险物料 | "能按时交货吗？" |
| `pmc-producibility` | BOM展开、可生产量 | "最多能产多少？" |

## LLM configuration

| Setting | Default | Env var |
|---------|---------|---------|
| API endpoint | `https://api.openai.com/v1` | `LLM_API_BASE` |
| Model | `gpt-4o` | `LLM_MODEL` |
| API key | — | `LLM_API_KEY` |
| Temperature | 0.3 | — |
| Max tokens | 4096 | — |

## System prompt structure

The system prompt is **domain-agnostic** — domain-specific reasoning comes from installed skills, not the system prompt:

```
你是 BKN Studio 的智能助手，帮助用户通过知识网络获取信息和生成分析。

当前工作区: {workspace.name}
绑定知识网络: {workspace.bknId}

可用资源: {resourceList}
已安装技能: {skillList with descriptions}

规则:
- 所有数据必须来自知识网络查询，禁止编造数据
- 引用数据时标注来源 (KN + OT + 实例键)
- 生成报告或分析结果时，保存为 artifact
- 遇到领域问题时，优先调用已安装的技能获取推理指导
```

## Future: KWeaver Agent delegation

When migrating to KWeaver-hosted Agent:
1. Replace local agent loop with `kweaver agent chat <id> -m "..."` 
2. Stream the remote agent's response back to client
3. Local skills become redundant (moved to KWeaver Agent config)
4. Workspace tools may still run locally for file I/O
