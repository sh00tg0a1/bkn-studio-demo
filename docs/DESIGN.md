# Design Philosophy

BKN Studio is a **domain-agnostic framework** that optimizes for **fast insight delivery** — the shortest path from a user's natural-language question to a trustworthy, shareable answer backed by any BKN knowledge network.

Core principle: **the framework provides infrastructure; domain intelligence comes from user-installed skills.**

Secondary goals:

- **Pluggable skills**: drop a `SKILL.md` into the workspace to teach the agent a new domain — no code changes.
- **Workspace isolation**: each workspace binds to one BKN + its own skills, resources, and artifacts.
- **SDK-first integration**: all KWeaver interactions go through `@kweaver-ai/kweaver-sdk`, keeping the app thin and upgradable.
- **Artifact-oriented output**: every meaningful result (report, chart, document) is persisted as a downloadable artifact, not lost in chat history.

→ Design docs catalog: [design-docs/index.md](design-docs/index.md)
