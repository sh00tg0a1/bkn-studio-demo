# Frontend Conventions

## Layout

Two-panel layout:

| Panel | Width | Content |
|-------|-------|---------|
| **Sidebar** (left) | 280–320 px, collapsible | Workspace switcher, resource list, artifact list |
| **Main** (right) | Remaining width | Chat dialog + artifact renderer |

### Sidebar sections (top to bottom)

1. **工作区切换** — dropdown/select showing all workspaces; "新建工作区" button.
2. **技能** — list of installed skills (from workspace `skills/`); shows name + description.
3. **资源** — list of user-uploaded files; upload button; per-file actions (delete).
4. **成果** — list of generated artifacts; per-file actions (preview, download, delete).

### Main panel modes

The main panel has two visual modes, toggled by user action:

| Mode | Trigger | Content |
|------|---------|---------|
| **Chat** (default) | Always visible | Message history + input box |
| **Artifact preview** | Click artifact in sidebar or in chat | Slide-in overlay from right, occupies full MainPanel; top bar with "关闭" and "下载" |

When an artifact is generated during chat, it appears **inline** as a card in the message stream with:
- File name + type icon
- "预览" button → switches to artifact preview mode (slide-in overlay)
- "下载" button → browser download

## Component conventions

- Use shadcn/ui primitives (Button, Dialog, Input, ScrollArea, etc.).
- Tailwind CSS for all styling — no CSS modules or styled-components.
- Co-locate component files: `ComponentName.tsx` + optional `use-component-name.ts` hook.
- Prefer Server Components; use `"use client"` only when interactivity is required.

## Routing

| Route | Purpose |
|-------|---------|
| `/` | Redirect to default workspace or workspace picker |
| `/workspace/[name]` | Main studio view (sidebar + chat) |

## State management

- **Workspace context**: React Context providing current workspace config + file lists. Data fetched via SWR.
- **Chat state**: `useChat` hook from Vercel AI SDK — manages message history, streaming, input, and tool call states.
- No global state library needed at current scale.

## Accessibility

- All interactive elements keyboard-navigable.
- ARIA labels on icon-only buttons.
- Focus management on panel transitions.
- Color contrast ≥ 4.5:1 (WCAG AA).

## Internationalization

- Primary UI language: Chinese (zh-CN).
- Code comments and docs: English.
- No i18n library needed initially; hardcoded Chinese strings in components.

## Design system reference

→ [docs/references/shadcn-ui-llms.txt](references/shadcn-ui-llms.txt)
