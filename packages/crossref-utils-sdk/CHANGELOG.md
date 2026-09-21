# crossref-utils-sdk

## 0.1.0

### Minor Changes

- 086d722: Split into monorepo packages for headless library use: `crossref-utils-sdk` (in-memory builders, MyST adapters, `abstractFromMdast`, DOI helpers, `validateDeposit`) and `crossref-utils` (the `crossref` CLI — filesystem / interactive workflows). Remove Curvenote DOI resource defaults from the library; callers pass `resolveDoiData`.

### Patch Changes

- 2941af8: Do not add doi to deposit if it cannot be normalized
- 972c40c: Support math in abstract
- 972c40c: Add chair contributor_type option
- 972c40c: Remove xrefs from abstract tree
