---
"crossref-utils-sdk": minor
"crossref-utils": minor
---

Split into monorepo packages for headless library use: `crossref-utils-sdk` (in-memory builders, MyST adapters, `abstractFromMdast`, DOI helpers, `validateDeposit`) and `crossref-utils` (the `crossref` CLI — filesystem / interactive workflows). Remove Curvenote DOI resource defaults from the library; callers pass `resolveDoiData`.
