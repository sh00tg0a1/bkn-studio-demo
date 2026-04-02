# Quality Scorecard

| Criterion | Target | Current | Notes |
|-----------|--------|---------|-------|
| TypeScript strict | `strict: true` | — | Enable from day 1 |
| ESLint clean | 0 errors | — | `next lint` + custom rules |
| Unit test coverage | ≥ 60% for `lib/` | — | Vitest |
| E2E critical paths | 3+ scenarios | — | Playwright |
| Docs freshness | Updated per phase | ✅ | Harness created |
| Accessibility | WCAG 2.1 AA | — | Keyboard nav, ARIA labels |
| Bundle size | < 200 KB first load JS | — | Monitor with `next build` |
| API response time | < 2s for non-streaming | — | KWeaver SDK latency |
