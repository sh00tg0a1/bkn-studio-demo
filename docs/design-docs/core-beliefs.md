# Core Engineering Beliefs

1. **SDK-first, not HTTP-first** — all KWeaver API interactions go through `@kweaver-ai/kweaver-sdk`. No raw `fetch` to KWeaver endpoints. This keeps auth, retry, and error handling in one place.

2. **Workspace as boundary** — a workspace is the unit of isolation. Config, resources, intermediate files, and artifacts are scoped to `~/.bkn-studio/<name>/`. Switching workspace = switching context entirely.

3. **Server owns the filesystem** — only Next.js API routes read/write `~/.bkn-studio/`. Client components never import `fs` or `path`. This makes the app portable to edge/serverless later.

4. **Stream by default** — agent chat responses are streamed (SSE). Never buffer a full response before showing it to the user.

5. **Artifacts are first-class** — generated outputs (HTML, Markdown, charts) are saved to disk, listed in the sidebar, and renderable inline. They outlive the chat session that produced them.

6. **Parse at boundaries** — validate and type-narrow external data (SDK responses, file reads, user uploads) at the API route layer. Interior code works with typed objects.

7. **Fail visibly** — surface SDK errors, file-not-found, and auth failures as clear UI messages. Never swallow errors silently.

8. **Chinese UX, English code** — UI strings are in Chinese (primary audience). Variable names, comments, and docs are in English.
