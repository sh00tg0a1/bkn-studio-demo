# Workspace Design

## Storage layout

```
~/.bkn-studio/
  └─ <workspace-name>/
      ├─ config.json          # workspace metadata
      ├─ skills/               # user-installed domain skills
      │   └─ <skill-name>/
      │       └─ SKILL.md      # skill definition (YAML frontmatter + Markdown rules)
      ├─ resources/            # user-uploaded files
      ├─ intermediate/         # agent process files (hidden from UI)
      └─ artifacts/            # generated outputs (visible in sidebar)
```

## config.json schema

```json
{
  "name": "my-workspace",
  "bknId": "kn-abc123",
  "createdAt": "2026-04-02T00:00:00Z",
  "updatedAt": "2026-04-02T00:00:00Z"
}
```

## Lifecycle

1. **Create**: user provides workspace name + BKN id → `mkdir -p` + write `config.json`.
2. **Switch**: list directories under `~/.bkn-studio/`, read each `config.json`, present in sidebar.
3. **Upload resource**: file saved to `resources/` via API route multipart handler.
4. **Generate artifact**: agent writes output to `artifacts/` with descriptive filename.
5. **Delete**: remove entire workspace directory (with confirmation dialog).

## Visibility rules

| Directory | Shown in sidebar | User-manageable |
|-----------|-----------------|-----------------|
| `skills/` | Yes (skill list) | Yes (install, remove) |
| `resources/` | Yes | Yes (upload, delete) |
| `intermediate/` | No | No |
| `artifacts/` | Yes | Yes (view, download, delete) |

## Constraints

- Workspace names: alphanumeric + hyphens, max 64 chars.
- Max file size for upload: 50 MB.
- No nested workspaces.
