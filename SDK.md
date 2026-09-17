# crossref-utils (library API)

Developer-facing docs for the **in-memory** Crossref library after the planned monorepo split. See [`plan-sdk.md`](./plan-sdk.md) for the implementation plan.

```ts
import {
  DoiBatch,
  journalXml,
  journalArticleFromMyst,
  preprintXml,
  preprintFromMyst,
  conferenceXml,
  conferencePaperFromMyst,
  databaseXml,
  datasetFromMyst,
  abstractFromMdast,
  generateDoi,
  suggestDois,
  validateDeposit,
} from 'crossref-utils';
```

CLI (filesystem, myst-cli, prompts) lives in a separate package (`crossref-cli`) and depends on this library. Prefer importing **`crossref-utils` only** from serverless / headless code.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Callers (serverless, CLI, future tools)                │
└───────────────┬─────────────────────────┬───────────────┘
                │                         │
                ▼                         ▼
┌───────────────────────────┐   ┌─────────────────────────┐
│  Adapters (format → DTO)  │   │  Crossref core          │
│  *FromMyst today          │   │  types + *Xml           │
│  *FromOther later         │──▶│  DoiBatch, dates, …     │
└───────────────────────────┘   │  abstractFromMdast      │
                                │  generateDoi / suggest   │
                                │  validateDeposit        │
                                └─────────────────────────┘
```

**Important separation:** MyST (or any other) *content processing* stays outside the Crossref core. Adapters only map already-structured frontmatter (and helpers like `abstractFromMdast` for processed mdast) into Crossref shapes. That leaves room for other X→Crossref parsers without bloating the core.

There is **no** separate `buildDeposit` facade or new deposit DTO layer — use the existing Crossref types + `*Xml`, and/or `*FromMyst`.

---

## Inputs (two existing paths)

### 1. Crossref DTOs → `*Xml`

Use types from this package (`JournalArticle`, `Preprint`, `ConferenceOptions`, `DatasetMetadata`, `DoiBatchOptions`, …) and builders:

- `journalXml` / `journalArticleXml` / …
- `conferenceXml` / `conferencePaperXml`
- `preprintXml`
- `databaseXml` / `datasetXml`
- `DoiBatch` → `.toXml()`

Suitable when the caller already thinks in Crossref terms, or after any future non-MyST adapter.

### 2. MyST frontmatter → `*FromMyst` (adapter)

Pass `myst-frontmatter` objects (in memory) into `journalArticleFromMyst`, `preprintFromMyst`, `conferencePaperFromMyst`, `datasetFromMyst`, contributor helpers, etc.

- No filesystem; no myst-cli `Session` required for project loading.
- Logging via a small **logger** interface (not a full MyST session).
- **DOI `resource` URLs are not defaulted to Curvenote** — supply `doi_data` explicitly or use an injectable resolver where provided (e.g. dataset path today).

Abstracts are **not** produced from markdown here. Build abstract JATS via `abstractFromMdast` (below), then pass the resulting element/string into the paper options / wire through the adapter as implemented.

---

## `abstractFromMdast`

```ts
function abstractFromMdast(mdast: GenericParent): Element; // or string — finalize in implementation
```

Caller supplies **processed MyST mdast** for the abstract part (from myst-cli or an equivalent pipeline). The library applies the same light transforms as today’s CLI (xrefs→links, cites→text, newlines→spaces), serializes with `myst-to-jats`, and wraps as `jats:abstract`.

Out of scope for this helper: loading projects, `parseMyst`, extracting parts from a full document.

```ts
const abstract = abstractFromMdast(abstractMdast);
const article = journalArticleFromMyst(logger, frontmatter, citations, abstract);
```

---

## DOI helpers

```ts
function generateDoi(prefix: string): string;
function suggestDois(count: number, prefix: string): string[];
```

- `prefix` is a **numeric DOI prefix** (e.g. `10.62329`). No built-in Curvenote/org alias map in this library — pass prefixes from your config.
- `generateDoi` → `{prefix}/{4 letters}{4 digits}` (unambiguous alphabet).
- `suggestDois` → `count` candidates for a UI or review step.

**Always human-review** generated DOIs before submitting to Crossref (avoid accidental slur-like or awkward strings). Interactive checkbox selection remains a CLI/caller concern, not part of this package.

---

## `validateDeposit`

```ts
function validateDeposit(xml: string, schema: DepositSchema): Promise<ValidationResult>;

type DepositSchema =
  | string
  | { entry: string; imports?: Record<string, string> };

type ValidationResult = {
  ok: boolean;
  errors: { message: string; path?: string; line?: number; column?: number }[];
};
```

Validates deposit XML **in process** with **xerces-wasm**. **You supply the schema** (entry XSD text, ideally plus `imports` for includes). The library does **not** download schemas.

Use `schemaVersionFromXml(xml)` if you need to pick which bundle to load. The CLI downloads/caches the Crossref `schemas/` tree and builds a bundle; apps can vendor a fixed version instead.

See [`docs/validation.md`](./docs/validation.md).

---

## Typical headless flow

```ts
import {
  DoiBatch,
  preprintFromMyst,
  abstractFromMdast,
  generateDoi,
  validateDeposit,
} from 'crossref-utils';

const doi = generateDoi(process.env.DOI_PREFIX!); // review before use
const abstract = abstractFromMdast(abstractMdast);

const body = preprintFromMyst(logger, mystFrontmatter, citations, abstract);
// ensure doi_data.resource is set for your host — no Curvenote default

const batch = new DoiBatch(
  {
    id: crypto.randomUUID(),
    depositor: { name: 'Example', email: 'deposits@example.org' },
  },
  body,
);

const xml = batch.toXml();
// App supplies a vendored DepositSchema for the schema version it emits
const { ok, errors } = await validateDeposit(xml, schemaBundle);
if (!ok) throw new Error(errors.map((e) => e.message).join('\n'));
```

Multi-article journal/conference deposits: build venue/issue XML with existing helpers, map each item with `*FromMyst` or `*Xml`, assemble body, wrap in `DoiBatch`.

---

## What belongs in `crossref-cli` (not this library)

- Path discovery, reading `myst.yml` / pages from disk  
- myst-cli `Session`, `getFileContent`, part extraction from projects  
- `parseMyst` for frontmatter abstract strings  
- inquirer prompts (deposit type, depositor, DOI checkbox selection)  
- Writing DOIs back into config files  

The CLI should call into `crossref-utils` for XML build, abstract mdast→JATS, DOI string generation, and validation.

---

## Package relationship

| Package | Role |
|---------|------|
| `crossref-utils` | In-memory Crossref core + MyST adapter + validate |
| `crossref-cli` | `crossref` binary; FS + interactive workflows |

Root import of `crossref-utils` is the supported library surface (no `/sdk` subpath required).
