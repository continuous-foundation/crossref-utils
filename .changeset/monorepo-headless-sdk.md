---
"crossref-utils": minor
"crossref-cli": minor
---

Split into monorepo packages for headless library use: `crossref-utils` (in-memory builders, MyST adapters, `abstractFromMdast`, DOI helpers, `validateDeposit`) and `crossref-cli` (filesystem / interactive workflows). Remove Curvenote DOI resource defaults from the library; callers pass `resolveDoiData`.
