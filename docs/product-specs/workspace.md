# Workspace

## Goal

Provide isolated, switchable work contexts where each workspace binds to a single BKN knowledge network and stores user resources + generated artifacts locally.

## Storage

All workspaces live under `~/.bkn-studio/<workspace-name>/`. See [design-docs/workspace-design.md](../design-docs/workspace-design.md) for full layout.

## User-visible behavior

### Create workspace

- User provides: workspace name (supports CJK and Unicode; 1–64 trimmed characters; no path separators or `<>:"/\|?*` / control chars) + BKN knowledge network ID.
- System creates directory structure + `config.json`.
- New workspace becomes active immediately.

### Switch workspace

- Sidebar shows all workspaces (read from `~/.bkn-studio/`).
- Click to switch; chat history is **not** carried across workspaces.
- Active workspace highlighted in sidebar.

### Resource management

- Upload: drag-and-drop or file picker → saved to `resources/`.
- List: shown in sidebar under "资源" section.
- Delete: right-click or action menu → confirm → remove file.
- Supported: any file type; max 50 MB per file.

### Artifacts

- Listed in sidebar under "成果" section.
- Click to preview inline (HTML rendered in iframe, Markdown rendered, code syntax-highlighted, other files show download link).
- Download and delete actions available.

### Delete workspace

- Confirmation dialog with workspace name.
- Removes entire directory.

## Edge cases

- Duplicate workspace name → reject with error message.
- Missing `config.json` → show workspace as "damaged", allow delete only.
- BKN ID no longer valid → show warning, allow re-configuration.
