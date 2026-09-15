# Plan: Package split for headless Crossref utils

Revised implementation plan after [PR #27 review](https://github.com/continuous-foundation/crossref-utils/pull/27) (Franklin Koch). Aligns with [`SDK.md`](./SDK.md).

## Goals

1. **Split the repo into two packages** (JATS-style monorepo):
   - `packages/crossref-utils` — lightweight, in-memory library (the “SDK”)
   - `packages/crossref-cli` — filesystem, myst-cli session, inquirer; depends on `-utils`
2. **Keep existing DTOs and APIs** — Crossref types + `*Xml` builders, and MyST frontmatter + `*FromMyst` adapters. No new `DepositInput` / `buildDeposit` facade.
3. **Maintain Crossref vs content-format separation** — core is format-agnostic; MyST is one adapter; future `*FromOther` helpers can map other frontmatter/layouts into Crossref DTOs without growing the core.
4. **Ship in-process XML validation** on `crossref-utils` (replace or supersede CLI-only `xmllint` for library callers).
5. **Remove Curvenote-specific hardcoding** from the library (resource URL defaults, DOI prefix alias map in code).

## Non-goals

- New Crossref-oriented deposit DTO layer / single `buildDeposit` entrypoint
- Shipping myst-cli / `parseMyst` / markdown pipelines inside `crossref-utils`
- Interactive DOI checkbox UI inside `-utils` (stays CLI or caller-owned)
- Changing Crossref schema version (stay on 5.3.1)

## Approach (Franklin’s three steps)

> Gut check: easier than a long facade plan — an initial package split gets ~90% of the way there.

1. Tear the single package into `-cli` (FS + interactivity) and `-utils` (everything else). Keep interfaces mostly unchanged.
2. Massage details: decouple abstract *extraction* (CLI / upstream MyST) from light mdast→JATS transforms (utils); swap MyST `Session` for a logger interface on adapters; injectable DOI resource resolution.
3. Land TS-native (or otherwise in-process) XSD validation on `-utils`; retire reliance on `xmllint` for the library API.

---

## Target layout

```
packages/
  crossref-utils/     # published as crossref-utils
    src/
      # Crossref core
      batch.ts, types.ts, dates.ts, contributors.ts, funding.ts, …
      journal.ts, conference.ts, preprint.ts, dataset.ts
      abstract.ts          # mdast → jats:abstract (transforms + myst-to-jats)
      doi.ts               # generateDoi, suggestDois (prefix always passed in)
      validate.ts          # in-process XSD validate
      fromMyst/            # adapter layer (not “core”)
        … *FromMyst helpers, Session→logger refactors
  crossref-cli/       # published as crossref-cli (bin: crossref)
    src/
      deposit.ts, generate.ts, parse.ts, validate.ts (CLI wrappers)
      # FS discovery, inquirer, myst-cli load/extract, write-back to myst.yml
```

Published names can stay `crossref-utils` for the library; CLI package name TBD (`crossref-cli` vs keeping a single npm name that re-exports — decide at implement time to minimize breakages).

---

## Workstreams

### 1. Monorepo split (first, high leverage)

- Introduce workspace (`packages/*`) following continuous-foundation JATS / similar monorepos.
- Move existing library modules → `crossref-utils`; CLI (`src/cli/**`, bin) → `crossref-cli`.
- `-cli` depends on `-utils`; `-utils` must not depend on commander/inquirer/myst-cli FS workflows.
- Keep `myst-frontmatter` / `myst-to-jats` / light myst types only where needed (adapters + abstract helper).
- Green existing tests; CLI smoke still works via workspace link.

### 2. Core vs MyST adapter boundary

**Core (`crossref-utils`):** Crossref DTOs (`types.ts`), `*Xml`, `DoiBatch`, contributors/dates/funding XML, DOI helpers, validate, `abstractFromMdast`.

**Adapter (`crossref-utils/fromMyst` or equivalent exports):** `*FromMyst` — maps `myst-frontmatter` → Crossref DTOs / elements. Document as the MyST adapter, not the only input path.

**Future:** other X→Crossref adapters (same package or later packages) map into core DTOs + `*Xml`. Do not fold foreign pipelines into core.

Refactor `*FromMyst` / `fundrefFromMyst` to take a **logger** (or `Pick<ISession, 'log'>`) instead of a full myst `Session`.

### 3. Abstracts: mdast in, JATS out

Agreed direction (Franklin option 2 + prior spike):

- Upstream (CLI or serverless caller) owns myst processing and supplies **processed abstract mdast**.
- `-utils` exposes **`abstractFromMdast(mdast)`** — FS-free transforms + `myst-to-jats` + `jats:abstract` wrap (logic lifted from today’s CLI).
- CLI: split `depositArticleFromSource` — extract/load with myst-cli in CLI; call `abstractFromMdast` from utils.
- Do **not** ship `parseMyst` in `-utils` (avoids pulling full MyST into the library).
- Plain-text-only abstract (lossy option 3) is out of scope as the primary path.

### 4. DOI helpers & Curvenote cleanup

- **`generateDoi(prefix: string)`** — keep; numeric prefix **always passed in** (no `curvenote` → `10.62329` map in library code).
- **`suggestDois(count, prefix)`** — non-interactive candidates for UIs; callers must still human-review before Crossref submit (slur / pronounceability concern).
- Prefix aliases (if needed) live in **caller config** or CLI only — not hardcoded in `-utils`.
- Remove hardcoded `https://doi.curvenote.com/...` from `*FromMyst` / helpers; require explicit `doi_data.resource` or an injectable resolver callback on adapters.
- Bonus (not SDK-specific): strip other Curvenote-only defaults as found.

### 5. Validation on `crossref-utils` (must land)

- Expose e.g. `validateDeposit(xml: string): Promise<ValidationResult>` from `-utils`.
- Spike for a **maintained pure JS/Node** XSD validator usable in serverless (no native addon if possible).
- Bundle Crossref 5.3.1 schema assets with the package (or load from package files without network).
- If in-process XSD proves blocked: document fallback (external validation service) but still ship a library `validate*` API contract — do not leave validation CLI/`xmllint`-only.
- CLI can call the utils validator; `xmllint` path may remain as optional local fallback during transition.

### 6. Docs & release

- Rewrite [`SDK.md`](./SDK.md) to describe `crossref-utils` as the public library (core + MyST adapter), not a `/sdk` subpath facade.
- Update root README for monorepo / package install (`crossref-utils` vs CLI).
- Changesets per package; note breaking changes (Curvenote defaults removed, Session→logger, package layout).

---

## Suggested order

1. Monorepo scaffolding + move files (utils vs cli)  
2. Logger refactor + Curvenote resource/prefix cleanup  
3. Extract `abstractFromMdast`; slim CLI deposit path  
4. `generateDoi` / `suggestDois` (prefix required); CLI uses them  
5. Validation spike → implement `validateDeposit` on utils  
6. Docs (`SDK.md`, README) + changesets  

## Test plan

- [ ] Workspace build/publish layout for both packages  
- [ ] Existing unit tests pass under `crossref-utils`  
- [ ] CLI deposit/generate/validate still work against workspace utils  
- [ ] `abstractFromMdast` fixture; CLI no longer duplicates transform logic  
- [ ] `*FromMyst` works with logger only (no Session)  
- [ ] No Curvenote URL/prefix defaults in utils  
- [ ] `validateDeposit` catches known-bad deposit XML; known-good passes  
- [ ] Serverless-shaped usage: import utils only, no FS  

## Open decisions (small)

- Exact npm name for the CLI package and whether the current `crossref` bin moves with a major bump.
- Which XSD-in-JS library survives the spike (or external service shape if none does).

## Explicitly dropped from prior spike plan

- `crossref-utils/sdk` subpath entry  
- New `DepositInput` / `buildDeposit` / `mystToDepositItem` facade types  
- Bundling DOI prefix alias constants into the library  
- Treating MyST frontmatter JSON as the *only* primary SDK input (both Crossref DTOs and MyST adapters remain)
