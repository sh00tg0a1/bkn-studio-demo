# BKN Integration

## Goal

Connect each workspace to a KWeaver BKN knowledge network, enabling schema browsing, instance queries, semantic search, and action execution — all through `@kweaver-ai/kweaver-sdk`.

## Configuration

Each workspace stores a single `bknId` in `config.json`. This ID identifies the KWeaver knowledge network to query.

```json
{ "bknId": "kn-abc123" }
```

## Authentication

- All auth handled by `@kweaver-ai/kweaver-sdk` via `~/.kweaver/` credential store.
- Studio does not manage passwords or tokens directly.
- If auth fails (401), the SDK auto-refreshes; if refresh fails, UI prompts user to re-login via `kweaver auth login`.

## Capabilities

### Schema browsing

- Fetch object types and relation types for the configured BKN.
- Display in sidebar or on-demand in chat context.
- SDK call: `kweaver bkn object-type list --kn-id <bknId>`

### Instance query

- Agent can query object instances with filters, pagination.
- SDK call: `kweaver bkn object-type query --kn-id <bknId> --object-type <type> --condition '...'`
- Results returned to chat as structured data or rendered as artifact.

### Semantic search

- Natural language search across the knowledge network.
- SDK call: `kweaver bkn search --kn-id <bknId> -q "query text"`

### Action execution

- Execute BKN actions (with user confirmation).
- SDK call: `kweaver bkn action execute --kn-id <bknId> --action <name> --params '...'`

## Future

- Switch to KWeaver Agent API for richer orchestration (currently using local agent with SDK as tool).
- Support multiple BKN bindings per workspace.
