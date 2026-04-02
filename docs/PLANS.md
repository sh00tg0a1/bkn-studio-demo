# Product Roadmap

## Phase 1 — Scaffold & Harness (done)

- [x] Harness documentation in `docs/`
- [x] Design spec: `docs/design-docs/2026-04-02-bkn-studio-design.md`
- [x] Implementation plan: `docs/exec-plans/active/2026-04-02-bkn-studio-mvp.md`

## Phase 1.5 — MVP Build (current, ~4.5h)

- [ ] Next.js project init with App Router + Vercel AI SDK
- [ ] Core libs: workspace, kweaver, skills, conversations, agent
- [ ] API routes: workspace CRUD, chat SSE, BKN list
- [ ] UI: two-panel layout, sidebar, chat panel, artifact preview
- [ ] Polish: loading/error/empty states, a11y, responsive

## Phase 2 — Core Chat & BKN Integration

- [ ] KWeaver SDK auth flow integration
- [ ] Chat streaming via Agent API
- [ ] BKN schema browsing in sidebar
- [ ] Resource upload to workspace

## Phase 3 — Artifacts & Reports

- [ ] Artifact renderer (HTML, Markdown, charts)
- [ ] Artifact persistence in `~/.bkn-studio/<ws>/artifacts/`
- [ ] Export / download artifacts
- [ ] Artifact gallery in sidebar

## Phase 4 — Polish & Production

- [ ] Multi-workspace switching UX
- [ ] Responsive / mobile layout
- [ ] Error handling & retry UX
- [ ] Performance optimization (streaming, caching)

---

Execution plans: [exec-plans/](exec-plans/)
