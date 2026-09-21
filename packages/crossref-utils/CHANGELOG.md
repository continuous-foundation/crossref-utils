# crossref-utils

## 0.1.0

### Minor Changes

- 086d722: Split into monorepo packages for headless library use: `crossref-utils-sdk` (in-memory builders, MyST adapters, `abstractFromMdast`, DOI helpers, `validateDeposit`) and `crossref-utils` (the `crossref` CLI — filesystem / interactive workflows). Remove Curvenote DOI resource defaults from the library; callers pass `resolveDoiData`.

### Patch Changes

- e33e28f: Accept files and folders as arguments to `crossref deposit`, deprecating `--file`

## 0.0.3

### Patch Changes

- 809edd0: Support abstract part
- 3129d74: Add deposit to cli
- 7011eea: Multiple equal_contributors may be 'first' authors
- 3129d74: Add preprint xml functions
- 3129d74: Refactor index file to smaller files
- de3af54: Lowercase DOI
- eb78734: Remove newlines in jats abstract
- 3129d74: Add journal xml deposit
- 3f0ce30: Added a reader utility for doi_batch files with help functions to recover conference metadata and papers
- c30fd7e: Warn if article and journal doi prefixes do not match

## 0.0.2

### Patch Changes

- Additional options around publication date

## 0.0.1

### Patch Changes

- Move pages before doi data
