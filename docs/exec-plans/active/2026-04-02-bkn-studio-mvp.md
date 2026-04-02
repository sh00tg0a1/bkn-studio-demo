# BKN Studio MVP Implementation Plan

> **For agentic workers:** Execute this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Each task should produce a working, committable unit.

**Goal:** Build a domain-agnostic studio framework that connects to any KWeaver BKN knowledge network, supports pluggable skills via system prompt injection, streams chat responses, and persists artifacts.

**Architecture:** Next.js 15 App Router. Vercel AI SDK (`streamText` + `useChat`) for agent loop with MiniMax (Anthropic-style). Workspace files at `~/.bkn-studio/`. KWeaver CLI via `child_process`.

**Tech Stack:** Next.js 15, TypeScript 5 (strict), Vercel AI SDK, @ai-sdk/anthropic, shadcn/ui, Tailwind CSS 4, SWR, pnpm

**Spec:** `docs/design-docs/2026-04-02-bkn-studio-design.md`

---

## File Map

```
src/
├─ app/
│   ├─ layout.tsx                              # Root layout, global providers, fonts
│   ├─ page.tsx                                # "/" → redirect to workspace or create
│   ├─ globals.css                             # Tailwind + shadcn theme vars
│   ├─ workspace/[name]/
│   │   ├─ layout.tsx                          # WorkspaceProvider context
│   │   └─ page.tsx                            # Two-panel: Sidebar + MainPanel
│   └─ api/
│       ├─ workspace/route.ts                  # GET list, POST create
│       ├─ workspace/[name]/route.ts           # GET detail, DELETE
│       ├─ workspace/[name]/resources/route.ts # GET list, POST upload
│       ├─ workspace/[name]/resources/[file]/route.ts # DELETE
│       ├─ workspace/[name]/conversations/route.ts    # GET list, POST new
│       ├─ workspace/[name]/conversations/[id]/route.ts # GET messages
│       ├─ workspace/[name]/artifacts/route.ts  # GET list
│       ├─ workspace/[name]/artifacts/[file]/route.ts # GET content, DELETE
│       ├─ chat/route.ts                        # POST → SSE stream
│       └─ bkn/route.ts                         # GET → kweaver bkn list
├─ components/
│   ├─ sidebar/
│   │   ├─ sidebar.tsx
│   │   ├─ workspace-switcher.tsx
│   │   ├─ skill-list.tsx
│   │   ├─ resource-list.tsx
│   │   └─ artifact-list.tsx
│   ├─ chat/
│   │   ├─ chat-panel.tsx
│   │   ├─ message-list.tsx
│   │   ├─ message-bubble.tsx
│   │   ├─ tool-call-indicator.tsx
│   │   ├─ artifact-card.tsx
│   │   ├─ chat-input.tsx
│   │   └─ conversation-list.tsx
│   ├─ artifact/
│   │   ├─ artifact-preview.tsx
│   │   ├─ html-renderer.tsx
│   │   ├─ markdown-renderer.tsx
│   │   └─ code-renderer.tsx
│   ├─ workspace/
│   │   ├─ create-workspace-dialog.tsx
│   │   └─ delete-workspace-dialog.tsx
│   └─ ui/                                     # shadcn/ui (auto-generated)
├─ lib/
│   ├─ workspace.ts                            # ~/.bkn-studio/ CRUD
│   ├─ kweaver.ts                              # child_process CLI wrapper
│   ├─ skills.ts                               # scan SKILL.md + parse frontmatter
│   ├─ conversations.ts                        # read/write conversation JSON
│   ├─ agent.ts                                # streamText config + tool defs
│   └─ utils.ts                                # shared helpers (paths, slugify)
├─ hooks/
│   ├─ use-workspace.ts                        # SWR hook for workspace data
│   └─ use-artifacts.ts                        # SWR hook for artifact list
└─ types/
    ├─ workspace.ts
    ├─ conversation.ts
    └─ skill.ts
```

---

## Task 1: Project Initialization

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `.env.local.example`, `.gitignore`

- [ ] **Step 1: Init Next.js project**

```bash
cd /Users/cx/Work/kweaver-ai/bkn-studio-demo
pnpm create next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-pnpm --no-turbopack
```

Accept overwrite prompts. This creates the base Next.js 15 project.

- [ ] **Step 2: Install dependencies**

```bash
pnpm add ai @ai-sdk/anthropic swr react-markdown remark-gfm gray-matter
pnpm add -D @types/node vitest
```

- [ ] **Step 3: Init shadcn/ui**

```bash
pnpm dlx shadcn@latest init -d
pnpm dlx shadcn@latest add button dialog input scroll-area separator tabs dropdown-menu sheet tooltip skeleton
```

- [ ] **Step 4: Create `.env.local.example`**

```env
LLM_API_BASE=https://api.minimax.chat/v1
LLM_MODEL=minimax-model-name
LLM_API_KEY=your-api-key-here
```

- [ ] **Step 5: Update `.gitignore`**

Append:
```
.env.local
.venv/
```

- [ ] **Step 6: Enable TypeScript strict mode**

In `tsconfig.json`, ensure `"strict": true` is set.

- [ ] **Step 7: Verify build**

```bash
pnpm build
```

Expected: successful build with zero errors.

- [ ] **Step 8: Commit**

```bash
git init && git add -A && git commit -m "chore: init Next.js 15 project with AI SDK, shadcn/ui"
```

---

## Task 2: TypeScript Types

**Files:**
- Create: `src/types/workspace.ts`, `src/types/conversation.ts`, `src/types/skill.ts`

- [ ] **Step 1: Create `src/types/workspace.ts`**

```typescript
export interface WorkspaceConfig {
  name: string;
  bknId: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceIndex {
  name: string;
  bknId: string;
  createdAt: string;
}

export interface ResourceFile {
  name: string;
  size: number;
  modifiedAt: string;
}

export interface ArtifactFile {
  name: string;
  size: number;
  type: string; // file extension
  modifiedAt: string;
}
```

- [ ] **Step 2: Create `src/types/conversation.ts`**

```typescript
export interface ConversationMeta {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: ConversationMessage[];
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  toolInvocations?: ToolInvocation[];
  createdAt?: string;
}

export interface ToolInvocation {
  toolCallId: string;
  toolName: string;
  args: Record<string, unknown>;
  result?: unknown;
  state: 'call' | 'result';
}
```

- [ ] **Step 3: Create `src/types/skill.ts`**

```typescript
export interface SkillMeta {
  name: string;
  description: string;
  path: string; // absolute path to SKILL.md
}

export interface SkillContent extends SkillMeta {
  content: string; // full markdown content
}
```

- [ ] **Step 4: Verify types compile**

```bash
pnpm tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/types/ && git commit -m "feat: add TypeScript types for workspace, conversation, skill"
```

---

## Task 3: Core Library — Workspace Manager

**Files:**
- Create: `src/lib/utils.ts`, `src/lib/workspace.ts`
- Test: `src/lib/__tests__/workspace.test.ts`

- [ ] **Step 1: Create `src/lib/utils.ts`**

```typescript
import path from 'path';
import os from 'os';

export const BKN_STUDIO_DIR = path.join(os.homedir(), '.bkn-studio');

export function workspacePath(name: string): string {
  return path.join(BKN_STUDIO_DIR, name);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 64);
}
```

- [ ] **Step 2: Create `src/lib/workspace.ts`**

Implement the following functions:
- `listWorkspaces(): Promise<WorkspaceIndex[]>` — read `workspaces.json` or scan dirs
- `getWorkspace(name: string): Promise<WorkspaceConfig>` — read `config.json`
- `createWorkspace(name: string, bknId: string): Promise<WorkspaceConfig>` — mkdir + write config + update index
- `deleteWorkspace(name: string): Promise<void>` — rm -rf + update index
- `listResources(name: string): Promise<ResourceFile[]>` — readdir `resources/`
- `saveResource(name: string, fileName: string, data: Buffer): Promise<void>` — write to `resources/`
- `deleteResource(name: string, fileName: string): Promise<void>`
- `listArtifacts(name: string): Promise<ArtifactFile[]>` — readdir `artifacts/`
- `readArtifact(name: string, fileName: string): Promise<string>` — read file content
- `writeArtifact(name: string, fileName: string, content: string): Promise<void>` — write to `artifacts/`
- `deleteArtifact(name: string, fileName: string): Promise<void>`

Each function operates on `~/.bkn-studio/<name>/`. `createWorkspace` should create subdirs: `skills/`, `resources/`, `conversations/`, `intermediate/`, `artifacts/`.

- [ ] **Step 3: Write tests for workspace CRUD**

Create `src/lib/__tests__/workspace.test.ts` using vitest. Test create → get → list → delete cycle using a temp directory (override `BKN_STUDIO_DIR` for tests via env or param).

- [ ] **Step 4: Run tests**

```bash
pnpm vitest run src/lib/__tests__/workspace.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/ && git commit -m "feat: workspace manager with fs CRUD for ~/.bkn-studio/"
```

---

## Task 4: Core Library — KWeaver CLI Wrapper

**Files:**
- Create: `src/lib/kweaver.ts`

- [ ] **Step 1: Create `src/lib/kweaver.ts`**

```typescript
import { execFile } from 'child_process';
import { promisify } from 'util';

const exec = promisify(execFile);

async function runKweaver(args: string[]): Promise<string> {
  const { stdout } = await exec('kweaver', args, {
    timeout: 30_000,
    maxBuffer: 10 * 1024 * 1024,
  });
  return stdout;
}

export async function listBknNetworks(): Promise<unknown[]> {
  const output = await runKweaver(['bkn', 'list', '--json']);
  return JSON.parse(output);
}

export async function bknQuery(
  bknId: string,
  objectType: string,
  options: { condition?: string; limit?: number }
): Promise<string> {
  const queryJson = JSON.stringify({
    limit: options.limit ?? 20,
    ...(options.condition ? { condition: JSON.parse(options.condition) } : {}),
  });
  return runKweaver(['bkn', 'object-type', 'query', bknId, objectType, queryJson]);
}

export async function bknSearch(bknId: string, query: string): Promise<string> {
  return runKweaver(['bkn', 'search', bknId, '-q', query]);
}

export async function bknSchema(bknId: string): Promise<string> {
  return runKweaver(['bkn', 'object-type', 'list', bknId]);
}

export async function bknAction(
  bknId: string,
  actionName: string,
  params: string
): Promise<string> {
  return runKweaver(['bkn', 'action', 'execute', bknId, '--action', actionName, '--params', params]);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/kweaver.ts && git commit -m "feat: kweaver CLI wrapper (child_process)"
```

---

## Task 5: Core Library — Skill Loader

**Files:**
- Create: `src/lib/skills.ts`

- [ ] **Step 1: Create `src/lib/skills.ts`**

```typescript
import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';
import { workspacePath } from './utils';
import type { SkillContent, SkillMeta } from '@/types/skill';

export async function loadWorkspaceSkills(workspaceName: string): Promise<SkillContent[]> {
  const skillsDir = path.join(workspacePath(workspaceName), 'skills');
  try {
    const entries = await fs.readdir(skillsDir, { withFileTypes: true });
    const skills: SkillContent[] = [];
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const skillPath = path.join(skillsDir, entry.name, 'SKILL.md');
      try {
        const raw = await fs.readFile(skillPath, 'utf-8');
        const { data, content } = matter(raw);
        skills.push({
          name: (data.name as string) || entry.name,
          description: (data.description as string) || '',
          path: skillPath,
          content,
        });
      } catch {
        // skip invalid skill dirs
      }
    }
    return skills;
  } catch {
    return [];
  }
}

export function buildSkillsPromptSection(skills: SkillContent[]): string {
  if (skills.length === 0) return '';
  const sections = skills.map(
    (s) => `## Skill: ${s.name}\n> ${s.description}\n\n${s.content}`
  );
  return `\n已加载的领域知识:\n\n---\n${sections.join('\n---\n')}\n---`;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/skills.ts && git commit -m "feat: skill loader with YAML frontmatter parsing"
```

---

## Task 6: Core Library — Conversation Persistence

**Files:**
- Create: `src/lib/conversations.ts`

- [ ] **Step 1: Create `src/lib/conversations.ts`**

Implement:
- `listConversations(workspaceName: string): Promise<ConversationMeta[]>` — read `conversations/index.json`
- `getConversation(workspaceName: string, id: string): Promise<Conversation>` — read `conversations/conv-<id>.json`
- `createConversation(workspaceName: string): Promise<ConversationMeta>` — create new file with empty messages, update index
- `saveMessages(workspaceName: string, id: string, messages: ConversationMessage[]): Promise<void>` — overwrite conversation file
- `updateTitle(workspaceName: string, id: string, title: string): Promise<void>` — update index and conversation file

Use `Date.now()` based IDs. Create `conversations/` dir and `index.json` if missing.

- [ ] **Step 2: Commit**

```bash
git add src/lib/conversations.ts && git commit -m "feat: conversation persistence (JSON files)"
```

---

## Task 7: Core Library — Agent (streamText + Tools)

**Files:**
- Create: `src/lib/agent.ts`

- [ ] **Step 1: Create `src/lib/agent.ts`**

```typescript
import { streamText, tool } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import * as kweaver from './kweaver';
import * as workspace from './workspace';
import { loadWorkspaceSkills, buildSkillsPromptSection } from './skills';
import type { WorkspaceConfig } from '@/types/workspace';

const anthropic = createAnthropic({
  baseURL: process.env.LLM_API_BASE,
  apiKey: process.env.LLM_API_KEY,
});

function buildSystemPrompt(config: WorkspaceConfig, skillsSection: string, resources: string[]): string {
  const resourceList = resources.length > 0 ? resources.join(', ') : '(无)';
  return `你是 BKN Studio 的智能助手，帮助用户通过知识网络获取信息和生成分析。

当前工作区: ${config.name}
绑定知识网络: ${config.bknId}
可用资源: ${resourceList}
${skillsSection}

规则:
- 所有数据必须来自知识网络查询，禁止编造数据
- 引用数据时标注来源 (KN + OT + 实例键)
- 生成报告或分析结果时，调用 write_artifact 工具保存
- 遇到领域问题时，参考已加载的领域知识中的推理规则`;
}

function buildTools(config: WorkspaceConfig) {
  return {
    bkn_query: tool({
      description: '查询 BKN 知识网络中的对象实例，返回 JSON 数据',
      parameters: z.object({
        objectType: z.string().describe('对象类型名称'),
        condition: z.string().optional().describe('查询条件 JSON'),
        limit: z.number().default(20).describe('返回数量上限'),
      }),
      execute: ({ objectType, condition, limit }) =>
        kweaver.bknQuery(config.bknId, objectType, { condition, limit }),
    }),
    bkn_search: tool({
      description: '语义搜索知识网络内容',
      parameters: z.object({
        query: z.string().describe('搜索关键词'),
      }),
      execute: ({ query }) => kweaver.bknSearch(config.bknId, query),
    }),
    bkn_schema: tool({
      description: '获取知识网络的对象类型和字段列表',
      parameters: z.object({}),
      execute: () => kweaver.bknSchema(config.bknId),
    }),
    bkn_action: tool({
      description: '执行知识网络 Action（注意：有副作用）',
      parameters: z.object({
        actionName: z.string(),
        params: z.string().describe('Action 参数 JSON'),
      }),
      execute: ({ actionName, params }) =>
        kweaver.bknAction(config.bknId, actionName, params),
    }),
    read_resource: tool({
      description: '读取用户上传的资源文件内容',
      parameters: z.object({
        filename: z.string(),
      }),
      execute: async ({ filename }) => {
        const content = await workspace.readResource(config.name, filename);
        return content;
      },
    }),
    list_resources: tool({
      description: '列出当前工作区的所有资源文件',
      parameters: z.object({}),
      execute: async () => {
        const files = await workspace.listResources(config.name);
        return JSON.stringify(files.map(f => f.name));
      },
    }),
    write_artifact: tool({
      description: '保存生成的内容为成果文件（HTML 报告、Markdown 文档等）',
      parameters: z.object({
        filename: z.string().describe('文件名，如 report.html'),
        content: z.string().describe('文件内容'),
      }),
      execute: async ({ filename, content }) => {
        await workspace.writeArtifact(config.name, filename, content);
        return `已保存成果: ${filename}`;
      },
    }),
    list_artifacts: tool({
      description: '列出当前工作区的所有成果文件',
      parameters: z.object({}),
      execute: async () => {
        const files = await workspace.listArtifacts(config.name);
        return JSON.stringify(files.map(f => f.name));
      },
    }),
  };
}

export async function chat(
  workspaceName: string,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
) {
  const config = await workspace.getWorkspace(workspaceName);
  const skills = await loadWorkspaceSkills(workspaceName);
  const skillsSection = buildSkillsPromptSection(skills);
  const resources = await workspace.listResources(workspaceName);
  const resourceNames = resources.map(r => r.name);

  return streamText({
    model: anthropic(process.env.LLM_MODEL || 'default-model'),
    system: buildSystemPrompt(config, skillsSection, resourceNames),
    messages,
    tools: buildTools(config),
    maxSteps: 10,
    temperature: 0.3,
    maxTokens: 4096,
  });
}
```

Note: `workspace.readResource` needs to be added to `workspace.ts` (reads file content from `resources/`).

- [ ] **Step 2: Add `readResource` to `workspace.ts`**

```typescript
export async function readResource(workspaceName: string, fileName: string): Promise<string> {
  const filePath = path.join(workspacePath(workspaceName), 'resources', fileName);
  return fs.readFile(filePath, 'utf-8');
}
```

- [ ] **Step 3: Verify types compile**

```bash
pnpm tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/agent.ts src/lib/workspace.ts && git commit -m "feat: agent loop with streamText, tools, skill injection"
```

---

## Task 8: API Routes — Workspace & BKN

**Files:**
- Create: `src/app/api/workspace/route.ts`, `src/app/api/workspace/[name]/route.ts`, `src/app/api/bkn/route.ts`

- [ ] **Step 1: Create `src/app/api/workspace/route.ts`**

```typescript
import { NextResponse } from 'next/server';
import * as ws from '@/lib/workspace';

export async function GET() {
  const workspaces = await ws.listWorkspaces();
  return NextResponse.json(workspaces);
}

export async function POST(req: Request) {
  const { name, bknId } = await req.json();
  if (!name || !bknId) {
    return NextResponse.json({ error: 'name and bknId required' }, { status: 400 });
  }
  try {
    const config = await ws.createWorkspace(name, bknId);
    return NextResponse.json(config, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 409 });
  }
}
```

- [ ] **Step 2: Create `src/app/api/workspace/[name]/route.ts`**

GET → `getWorkspace(name)`, DELETE → `deleteWorkspace(name)`.

- [ ] **Step 3: Create `src/app/api/bkn/route.ts`**

GET → `kweaver.listBknNetworks()` → return JSON.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/ && git commit -m "feat: workspace CRUD + BKN list API routes"
```

---

## Task 9: API Routes — Resources, Conversations, Artifacts, Chat

**Files:**
- Create: remaining API route files under `src/app/api/workspace/[name]/`
- Create: `src/app/api/chat/route.ts`

- [ ] **Step 1: Resources routes**

`src/app/api/workspace/[name]/resources/route.ts`:
- GET → `listResources(name)`
- POST → parse multipart form data → `saveResource(name, file.name, buffer)`

`src/app/api/workspace/[name]/resources/[file]/route.ts`:
- DELETE → `deleteResource(name, file)`

- [ ] **Step 2: Conversations routes**

`src/app/api/workspace/[name]/conversations/route.ts`:
- GET → `listConversations(name)`
- POST → `createConversation(name)`

`src/app/api/workspace/[name]/conversations/[id]/route.ts`:
- GET → `getConversation(name, id)`

- [ ] **Step 3: Artifacts routes**

`src/app/api/workspace/[name]/artifacts/route.ts`:
- GET → `listArtifacts(name)`

`src/app/api/workspace/[name]/artifacts/[file]/route.ts`:
- GET → `readArtifact(name, file)` (return raw content with appropriate content-type)
- DELETE → `deleteArtifact(name, file)`

- [ ] **Step 4: Chat route**

`src/app/api/chat/route.ts`:

```typescript
import { chat } from '@/lib/agent';

export async function POST(req: Request) {
  const { workspaceName, messages } = await req.json();
  const result = await chat(workspaceName, messages);
  return result.toDataStreamResponse();
}
```

- [ ] **Step 5: Verify all routes compile**

```bash
pnpm tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add src/app/api/ && git commit -m "feat: API routes for resources, conversations, artifacts, chat"
```

---

## Task 10: UI Shell — Layout, Routing, Providers

**Files:**
- Modify: `src/app/layout.tsx`, `src/app/globals.css`
- Create: `src/app/page.tsx`, `src/app/workspace/[name]/layout.tsx`, `src/app/workspace/[name]/page.tsx`
- Create: `src/hooks/use-workspace.ts`

- [ ] **Step 1: Update root layout**

`src/app/layout.tsx`: set `<html lang="zh-CN">`, import fonts (use a distinctive font pairing per `ui-ux-pro-max`), wrap children in any global providers.

- [ ] **Step 2: Root page redirect**

`src/app/page.tsx`: Server Component that calls `listWorkspaces()`. If workspaces exist, redirect to first. Otherwise render a centered "创建工作区" CTA.

- [ ] **Step 3: Create `src/hooks/use-workspace.ts`**

SWR hook that fetches workspace detail + resources + artifacts + conversations + skills:

```typescript
import useSWR from 'swr';
const fetcher = (url: string) => fetch(url).then(r => r.json());

export function useWorkspace(name: string) {
  const { data: config } = useSWR(`/api/workspace/${name}`, fetcher);
  const { data: resources, mutate: mutateResources } = useSWR(`/api/workspace/${name}/resources`, fetcher);
  const { data: artifacts, mutate: mutateArtifacts } = useSWR(`/api/workspace/${name}/artifacts`, fetcher);
  const { data: conversations, mutate: mutateConversations } = useSWR(`/api/workspace/${name}/conversations`, fetcher);
  return { config, resources, artifacts, conversations, mutateResources, mutateArtifacts, mutateConversations };
}
```

- [ ] **Step 4: Workspace layout + provider**

`src/app/workspace/[name]/layout.tsx`: Client Component wrapper that provides workspace context to children.

- [ ] **Step 5: Workspace page — two-panel shell**

`src/app/workspace/[name]/page.tsx`: render `<Sidebar />` + `<ChatPanel />` in a flex row. Both can be placeholder `<div>` for now.

- [ ] **Step 6: Verify build + visit `/`**

```bash
pnpm dev
```

Open `http://localhost:3000` — should show workspace create CTA or redirect.

- [ ] **Step 7: Commit**

```bash
git add src/ && git commit -m "feat: UI shell with routing, workspace provider, two-panel layout"
```

---

## Task 11: UI — Sidebar (Workspace Switcher + Create Dialog)

**Files:**
- Create: `src/components/sidebar/sidebar.tsx`, `src/components/sidebar/workspace-switcher.tsx`
- Create: `src/components/workspace/create-workspace-dialog.tsx`, `src/components/workspace/delete-workspace-dialog.tsx`

- [ ] **Step 1: Sidebar container**

`sidebar.tsx`: vertical flex column, 280px width (collapsible via state). Sections: WorkspaceSwitcher, SkillList, ResourceList, ArtifactList (last three can be placeholders).

- [ ] **Step 2: WorkspaceSwitcher**

Dropdown showing all workspaces (fetch via SWR `/api/workspace`). Active workspace highlighted. "新建工作区" button opens CreateWorkspaceDialog. Click workspace → `router.push(/workspace/[name])`.

- [ ] **Step 3: CreateWorkspaceDialog**

shadcn Dialog. Form fields: workspace name (Input), BKN selection (fetch `/api/bkn` → dropdown). On submit: POST `/api/workspace` → navigate to new workspace.

- [ ] **Step 4: DeleteWorkspaceDialog**

shadcn Dialog with confirmation text. On confirm: DELETE `/api/workspace/[name]` → navigate to `/`.

- [ ] **Step 5: Wire into workspace page**

Replace placeholder Sidebar in `workspace/[name]/page.tsx` with real `<Sidebar />`.

- [ ] **Step 6: Test manually**

Create workspace, switch workspaces, delete workspace.

- [ ] **Step 7: Commit**

```bash
git add src/components/ src/app/ && git commit -m "feat: sidebar with workspace switcher, create/delete dialogs"
```

---

## Task 12: UI — Sidebar Lists (Skills, Resources, Artifacts)

**Files:**
- Create: `src/components/sidebar/skill-list.tsx`, `src/components/sidebar/resource-list.tsx`, `src/components/sidebar/artifact-list.tsx`

- [ ] **Step 1: SkillList**

Fetch skills from workspace (add a `/api/workspace/[name]/skills` route or derive from workspace data). Display name + description for each. Empty state: "暂无技能，将 SKILL.md 放入 skills/ 目录".

- [ ] **Step 2: ResourceList**

Display files from `useWorkspace().resources`. Upload button → file picker → POST multipart to `/api/workspace/[name]/resources`. Per-file delete action (DropdownMenu). Drag-and-drop upload zone.

- [ ] **Step 3: ArtifactList**

Display files from `useWorkspace().artifacts`. Click → trigger artifact preview (pass event up or use context). Per-file actions: preview, download, delete.

- [ ] **Step 4: Wire into Sidebar**

Add all three lists as collapsible sections (use Separator between them).

- [ ] **Step 5: Test manually**

Upload a file, see it listed, delete it. Check skills section shows empty state.

- [ ] **Step 6: Commit**

```bash
git add src/ && git commit -m "feat: sidebar skill, resource, artifact lists with upload/delete"
```

---

## Task 13: UI — Chat Panel (Core)

**Files:**
- Create: `src/components/chat/chat-panel.tsx`, `src/components/chat/chat-input.tsx`, `src/components/chat/message-list.tsx`, `src/components/chat/message-bubble.tsx`, `src/components/chat/conversation-list.tsx`

- [ ] **Step 1: ChatPanel**

Top-level chat container. Uses `useChat` from `ai/react`:

```typescript
const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
  api: '/api/chat',
  body: { workspaceName },
});
```

Composes: ConversationList (header), MessageList (scrollable body), ChatInput (footer).

- [ ] **Step 2: ConversationList**

Horizontal or dropdown list of conversations. "新建对话" button → POST `/api/workspace/[name]/conversations`. Active conversation highlighted. Switch loads messages from that conversation.

- [ ] **Step 3: MessageList**

ScrollArea rendering `messages.map(m => <MessageBubble />)`. Auto-scroll to bottom on new message.

- [ ] **Step 4: MessageBubble**

Renders user messages (right-aligned, accent color) and assistant messages (left-aligned, rendered as Markdown via `react-markdown` with `remark-gfm`). Include "保存为成果" button on assistant messages.

- [ ] **Step 5: ChatInput**

Input + Send button. Disable during `isLoading`. Support Ctrl+Enter to send.

- [ ] **Step 6: Empty state**

When no messages: centered guidance text "向知识网络提问" + 3 example question buttons (generic, not PMC-specific).

- [ ] **Step 7: Wire into workspace page**

Replace placeholder ChatPanel in `workspace/[name]/page.tsx`.

- [ ] **Step 8: Test manually**

Open workspace, type a message, see streaming response (requires valid LLM config in `.env.local`).

- [ ] **Step 9: Commit**

```bash
git add src/ && git commit -m "feat: chat panel with useChat, message rendering, conversation switching"
```

---

## Task 14: UI — Chat Enhancements (Tool Calls, Artifact Cards)

**Files:**
- Create: `src/components/chat/tool-call-indicator.tsx`, `src/components/chat/artifact-card.tsx`

- [ ] **Step 1: ToolCallIndicator**

Detect `toolInvocations` in message. Render collapsible card: "正在查询知识网络..." while state=`call`, expand to show tool name + args + result when state=`result`.

- [ ] **Step 2: ArtifactCard**

When `write_artifact` tool result appears in message, render an inline card with: file icon, filename, "预览" button (triggers ArtifactPreview), "下载" button (direct download link to `/api/workspace/[name]/artifacts/[file]`).

- [ ] **Step 3: "保存为成果" action**

On assistant MessageBubble, add action button. On click: POST content to write_artifact endpoint (or call a dedicated save endpoint). Mutate artifacts list via SWR.

- [ ] **Step 4: Integrate into MessageBubble**

Render ToolCallIndicator and ArtifactCard within MessageBubble based on message content.

- [ ] **Step 5: Commit**

```bash
git add src/components/chat/ && git commit -m "feat: tool call indicators and artifact cards in chat"
```

---

## Task 15: UI — Artifact Preview & Renderers

**Files:**
- Create: `src/components/artifact/artifact-preview.tsx`, `src/components/artifact/html-renderer.tsx`, `src/components/artifact/markdown-renderer.tsx`, `src/components/artifact/code-renderer.tsx`

- [ ] **Step 1: ArtifactPreview**

Overlay panel that slides in from the right over the chat area. Props: `workspaceName`, `fileName`, `onClose`. Fetches content from `/api/workspace/[name]/artifacts/[file]`. Top bar: filename, "关闭" button, "下载" button. Content area: delegates to appropriate renderer based on file extension.

- [ ] **Step 2: HtmlRenderer**

Sandboxed iframe. Set content via `srcdoc`. Sandbox attributes: `allow-scripts` but no `allow-same-origin`.

- [ ] **Step 3: MarkdownRenderer**

`react-markdown` with `remark-gfm`. Style with Tailwind prose classes.

- [ ] **Step 4: CodeRenderer**

Use `shiki` for syntax highlighting. Detect language from file extension. Fallback to preformatted text.

Install shiki:
```bash
pnpm add shiki
```

- [ ] **Step 5: Wire preview trigger**

Connect ArtifactList click and ArtifactCard "预览" button to open ArtifactPreview. Use state in workspace page to track active preview.

- [ ] **Step 6: Test manually**

Create an artifact (via chat or manually place a file), click preview, verify rendering for HTML, MD, and code files.

- [ ] **Step 7: Commit**

```bash
git add src/components/artifact/ src/app/ && git commit -m "feat: artifact preview with HTML iframe, markdown, and code renderers"
```

---

## Task 16: Conversation Persistence Integration

**Files:**
- Modify: `src/app/api/chat/route.ts`, `src/components/chat/chat-panel.tsx`

- [ ] **Step 1: Update chat route to persist messages**

After `streamText` completes (`onFinish` callback), save the full message array to the conversation file via `conversations.saveMessages()`. If no conversationId provided, create a new conversation.

- [ ] **Step 2: Auto-generate conversation title**

In `onFinish`, if conversation has no title yet (first exchange), make a lightweight LLM call to generate a ≤10 char Chinese title from the user's first message. Fallback: truncate first message to 10 chars. Update via `conversations.updateTitle()`.

- [ ] **Step 3: Load conversation on switch**

In ChatPanel, when user selects a conversation from ConversationList, fetch messages from `/api/workspace/[name]/conversations/[id]` and populate `useChat` initial messages.

- [ ] **Step 4: Test conversation persistence**

Send messages, refresh page, verify messages are restored. Switch conversations, verify isolation.

- [ ] **Step 5: Commit**

```bash
git add src/ && git commit -m "feat: conversation persistence with auto-generated titles"
```

---

## Task 17: Polish & Integration Testing

**Files:**
- Modify: various UI components for quality

- [ ] **Step 1: Run ui-ux-pro-max design system check**

Generate design system recommendations:
```bash
python3 skills/ui-ux-pro-max/scripts/search.py "knowledge network studio tool professional" --design-system -p "BKN Studio"
```

Apply recommended color palette, typography, and spacing to `globals.css` and components.

- [ ] **Step 2: Loading states**

Add skeleton loaders for: workspace list, resource list, artifact list, conversation list. Use shadcn Skeleton component.

- [ ] **Step 3: Error states**

Add error boundaries. Show clear error messages for: KWeaver CLI failures, LLM timeouts, file not found. Include retry actions.

- [ ] **Step 4: Empty states**

Verify all lists show helpful empty states with guidance text.

- [ ] **Step 5: Accessibility pass**

Verify: keyboard navigation through sidebar and chat, ARIA labels on icon buttons, focus management on dialog open/close, color contrast.

- [ ] **Step 6: Responsive check**

Test at 1024px, 768px. Sidebar should collapse. Chat should fill width.

- [ ] **Step 7: TypeScript + Lint clean**

```bash
pnpm tsc --noEmit && pnpm lint
```

Fix any errors.

- [ ] **Step 8: Final commit**

```bash
git add -A && git commit -m "feat: polish — loading states, error handling, a11y, responsive"
```

---

## Execution Summary

| Task | Deliverable | Estimated effort |
|------|------------|-----------------|
| 1 | Project init + deps | 10 min |
| 2 | TypeScript types | 5 min |
| 3 | Workspace manager (lib) | 20 min |
| 4 | KWeaver CLI wrapper (lib) | 10 min |
| 5 | Skill loader (lib) | 10 min |
| 6 | Conversation persistence (lib) | 15 min |
| 7 | Agent loop + tools (lib) | 20 min |
| 8 | API routes: workspace + BKN | 10 min |
| 9 | API routes: resources, artifacts, conversations, chat | 20 min |
| 10 | UI shell: layout, routing, providers | 15 min |
| 11 | Sidebar: workspace switcher + dialogs | 20 min |
| 12 | Sidebar: skill, resource, artifact lists | 20 min |
| 13 | Chat panel core | 25 min |
| 14 | Chat enhancements: tool calls, artifact cards | 15 min |
| 15 | Artifact preview + renderers | 20 min |
| 16 | Conversation persistence integration | 15 min |
| 17 | Polish + integration | 30 min |
| **Total** | | **~4.5 hours** |
