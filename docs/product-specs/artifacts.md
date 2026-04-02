# Artifacts

## Goal

Persist and render agent-generated outputs (HTML pages, Markdown documents, code files, charts) as first-class objects that outlive the chat session.

## Storage

Artifacts are saved to `~/.bkn-studio/<workspace>/artifacts/` with descriptive filenames.

Naming convention: `<timestamp>-<slug>.<ext>` (e.g. `20260402-shortage-report.html`).

## Rendering

| File type | Rendering strategy |
|-----------|-------------------|
| `.html` | Sandboxed iframe |
| `.md` | Rendered Markdown (react-markdown) |
| `.txt`, `.csv` | Preformatted text |
| `.js`, `.ts`, `.py`, `.sql` | Syntax-highlighted code block |
| `.json` | Collapsible JSON tree |
| Other | Download link only |

## User interactions

- **Preview**: click artifact in sidebar → opens in main panel (replacing or overlaying chat).
- **Download**: action button → browser download.
- **Delete**: action button → confirmation → remove file.
- **Share** (future): generate a shareable link or export as PDF.

## Intermediate files

Process files generated during agent reasoning are saved to `intermediate/` and are **never shown** in the sidebar or artifact list. These exist for debugging and can be cleaned up periodically.

## Constraints

- Max artifact size: 10 MB (larger outputs should be chunked or summarized).
- Artifact filenames are auto-generated; user can rename via UI (future).
- HTML artifacts run in a sandboxed iframe with no access to parent page or network.
