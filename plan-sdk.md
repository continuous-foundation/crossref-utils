# Plan: Headless Crossref SDK

Implementation plan for the developer API documented in [`SDK.md`](./SDK.md).

## Goals

- Expose an in-memory SDK at `crossref-utils/sdk` for serverless / headless callers.
- Primary input: Crossref-oriented DTO → deposit XML via a thin facade over existing builders.
- Separately validate XML in-process (no `xmllint`, no filesystem).
- Helpers: `abstractFromMdast`, `generateDoi`, `suggestDois`, optional `mystToDepositItem`.
- Leave CLI behavior working; do not rewrite CLI onto the SDK in this cut (optional follow-up).

## Non-goals (v1)

- Interactive DOI selection / inquirer
- Path discovery, writing DOIs into `myst.yml`
- Full myst-cli loading inside the SDK
- Changing Crossref schema version (stay on 5.3.1)

## Approach

**Thin facade (recommended):** new `src/sdk/` maps DTOs → existing `journalXml` / `conferenceXml` / `preprintXml` / `databaseXml` + `DoiBatch`. Extract shared helpers (`abstractFromMdast`, DOI prefix map) from CLI into library modules the SDK re-exports. Avoid duplicating XML construction.

---

## Workstreams

### 1. Package surface

- Add `src/sdk/index.ts` as the SDK entry.
- Update `package.json` `exports`:
  - `"."` — existing root (legacy)
  - `"./sdk"` — SDK entry + types
- Ensure ESM build emits `dist/sdk/index.js` and `.d.ts`.
- Do not bundle Node-only CLI deps into the SDK entry if avoidable (keep `inquirer` / path discovery out of `src/sdk`).

### 2. DTO types

- Add `src/sdk/types.ts` (or `src/sdk/dto.ts`) matching `SDK.md`:
  - `DepositInput`, `DepositItem`, `BatchOptions`, `VenueOptions`, `DoiDataInput`, etc.
- Type subtype enums for posted content and `dataset_type`.
- Define `DepositError` + issue shape.

### 3. Resource resolution

- Implement `resolveDoiData(doi_data, resourceResolver, ctx)` used by `buildDeposit`.
- Remove Curvenote URL defaults from the **SDK path** (legacy `*FromMyst` / CLI may keep current behavior until a later migration).
- Prefer passing explicit `doi_data` into existing `*Xml` builders rather than going through `*FromMyst` where those hardcode Curvenote resources.

### 4. `buildDeposit`

- Implement `src/sdk/buildDeposit.ts`:
  - Validate item counts and required venue fields per `type`.
  - Map contributors / funding / dates / citations / `abstractJats` → structures expected by existing builders.
  - Parse `abstractJats` string into XAST (`jats:abstract`) for builders that expect an `Element`.
  - Set posted-content / dataset subtype attributes on emit.
  - Wrap body in `DoiBatch`, return `{ xml, batchId }`.
- Unit tests per deposit type (fixtures of DTO → XML snapshots or selective XPath/string asserts).

### 5. `abstractFromMdast`

- Move CLI abstract pipeline pieces used after mdast exists into a shared module (e.g. `src/abstract.ts`):
  - transforms from `src/cli/utils.ts` that are FS-free
  - `JatsSerializer` + wrap / unwrap xref
- Export `abstractFromMdast` from SDK.
- Keep CLI `depositArticleFromSource` calling the shared helper (small refactor, behavior unchanged).
- Tests with a minimal mdast fixture.

### 6. DOI helpers

- Keep `generateDoi` in `src/utils.ts`.
- Move `DOI_PREFIXES` (today’s CLI `PREFIX` map) to a shared module (e.g. `src/doi.ts`).
- Add `suggestDois(count, prefix)` (non-interactive array of `generateDoi`).
- Resolve aliases inside `generateDoi` or a thin `resolvePrefix` used by both helpers.
- Re-export from `crossref-utils/sdk`; root may continue exporting `generateDoi`.
- CLI `generate` / `selectNewDois` import shared prefix map + `generateDoi` (selection stays in CLI).

### 7. `validateDeposit`

- Add in-memory validation module under `src/sdk/validate.ts` (or `src/validateMemory.ts`).
- Bundle or ship Crossref 5.3.1 XSD (or a maintained JS binding) as package assets.
- Choose a serverless-friendly approach (evaluate in implementation spike):
  - Prefer a pure-JS XML + XSD validator that works without native bindings, **or**
  - Structural validation + well-formedness if full XSD proves impractical in v1 — document any gap vs `xmllint` in `SDK.md`.
- API: `validateDeposit(xml) → Promise<ValidationResult>` with `{ ok, errors[] }`.
- Leave existing `xmllint` helpers for CLI; do not export them from `/sdk`.
- Tests: known-good deposit XML passes; deliberately broken XML fails with messages.

### 8. `mystToDepositItem`

- Adapter in `src/sdk/myst.ts`: map frontmatter-like JSON → `DepositItem` fields (title, authors→contributors, license URL, funding, pages, doi).
- No abstract, no resource URL invention, no FS.
- Optionally stub/document `mystToVenue` if journal/conference venue mapping is needed immediately; otherwise follow-up.
- Tests with sample frontmatter JSON.

### 9. Docs & changelog

- Keep [`SDK.md`](./SDK.md) as the developer contract; update enums/field names if implementation discovers schema mismatches.
- Add a short pointer in `README.md` to `SDK.md` / `crossref-utils/sdk`.
- Changeset noting new SDK export and helpers.

---

## Suggested implementation order

1. Package `exports` + empty SDK barrel  
2. DOI helpers (`DOI_PREFIXES`, `suggestDois`) + tests  
3. Extract `abstractFromMdast` + wire CLI to shared helper  
4. DTO types + `buildDeposit` for `preprint`, then `journal`, `conference`, `dataset`  
5. `validateDeposit` spike → implement  
6. `mystToDepositItem`  
7. README + changeset  

## Test plan

- [ ] `generateDoi` / `suggestDois` / prefix aliases
- [ ] `abstractFromMdast` golden mdast → JATS string
- [ ] `buildDeposit` for each of the four types (required fields, multi-item journal/conference)
- [ ] Preprint rejects `items.length !== 1`
- [ ] Missing `resource` without resolver throws `DepositError`
- [ ] Subtypes appear on emitted XML
- [ ] `validateDeposit` accept/reject fixtures
- [ ] `mystToDepositItem` maps authors, doi, license; leaves abstract unset
- [ ] Existing CLI deposit / unit tests still pass

## Follow-ups (out of this plan)

- Rewire CLI `deposit` to build DTOs and call `buildDeposit`
- Remove Curvenote defaults from legacy `*FromMyst` once CLI uses `resourceResolver`
- Richer venue mapper from MyST project JSON
- Sync `validateDeposit` if the chosen library allows

## Open implementation detail

**XSD-in-JS library choice** — confirm during workstream 7 which dependency satisfies: Crossref 5.3.1, no native addon, works in typical serverless Node runtimes. If full XSD is blocked, ship well-formedness + required-element checks in v1 and note the limitation in `SDK.md`.
