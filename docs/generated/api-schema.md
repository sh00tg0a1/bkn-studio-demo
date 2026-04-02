# API Schema (Generated)

> **Do not hand-edit.** Regenerate from source when API routes change.

## Regeneration

```bash
# Future: auto-generate from Next.js API routes
# pnpm run generate:api-schema
```

## Current API routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/chat` | POST (SSE) | Send message to agent, stream response |
| `/api/workspace` | GET | List all workspaces |
| `/api/workspace` | POST | Create workspace |
| `/api/workspace/[name]` | GET | Get workspace details |
| `/api/workspace/[name]` | DELETE | Delete workspace |
| `/api/workspace/[name]/resources` | GET | List resources |
| `/api/workspace/[name]/resources` | POST | Upload resource file |
| `/api/workspace/[name]/resources/[file]` | DELETE | Delete resource |
| `/api/workspace/[name]/artifacts` | GET | List artifacts |
| `/api/workspace/[name]/artifacts/[file]` | GET | Read/render artifact |
| `/api/bkn/schema` | GET | Get BKN object types & relations |
| `/api/bkn/query` | POST | Query BKN object instances |

> DB schema (`docs/generated/db-schema.md`) not applicable — BKN Studio uses filesystem storage + remote KWeaver API.
