# crossref-utils SDK

Developer-facing API for building and validating Crossref deposit XML **in memory**. Intended for serverless and other headless callers.

Import from the supported entrypoint:

```ts
import {
  buildDeposit,
  validateDeposit,
  abstractFromMdast,
  mystToDepositItem,
  generateDoi,
  suggestDois,
  DOI_PREFIXES,
} from 'crossref-utils/sdk';
```

The package root (`crossref-utils`) continues to export legacy builders used by the CLI. Prefer `crossref-utils/sdk` for new integrations.

## Design principles

- **Crossref-oriented DTO** is the primary input — not MyST project paths or filesystem state.
- **No filesystem, no prompts** — callers supply metadata; DOI choice and abstract production happen outside or via helpers.
- **Thin layer over existing XML builders** — `buildDeposit` maps DTOs onto the current `*Xml` / `DoiBatch` implementations.
- **Validation is in-process** — pure JS against Crossref schema 5.3.1; no `xmllint`.

## Quick start

```ts
import {
  buildDeposit,
  validateDeposit,
  abstractFromMdast,
  generateDoi,
} from 'crossref-utils/sdk';

const doi = generateDoi('10.62329');
const abstractJats = abstractFromMdast(abstractMdast); // processed MyST mdast

const { xml, batchId } = buildDeposit({
  type: 'preprint',
  batch: {
    depositor: { name: 'Example Org', email: 'deposits@example.org' },
  },
  items: [
    {
      title: 'Example preprint',
      date: '2026-01-15',
      abstractJats,
      doi_data: {
        doi,
        resource: `https://example.org/articles/${doi}`,
      },
      contributors: [
        {
          nameParsed: { given: 'Ada', family: 'Lovelace', literal: 'Ada Lovelace' },
          sequence: 'first',
          contributor_role: 'author',
        },
      ],
    },
  ],
});

const result = await validateDeposit(xml);
if (!result.ok) {
  throw new Error(result.errors.map((e) => e.message).join('\n'));
}
```

---

## `buildDeposit`

```ts
function buildDeposit(input: DepositInput): BuildDepositResult;
```

```ts
type BuildDepositResult = {
  xml: string;
  batchId: string;
};
```

Single entrypoint for all deposit kinds. Builds a Crossref `doi_batch` (schema **5.3.1**) and returns serialized XML.

### `DepositInput`

```ts
type DepositType = 'journal' | 'conference' | 'preprint' | 'dataset';

type DepositInput = {
  type: DepositType;
  batch: BatchOptions;
  /** Used when an item (or venue) omits `doi_data.resource`. */
  resourceResolver?: ResourceResolver;
  /** Type-specific container metadata (journal / conference / database). */
  venue?: VenueOptions;
  items: DepositItem[];
};
```

| `type` | `items.length` | `venue` |
|--------|----------------|---------|
| `preprint` | exactly `1` | omitted |
| `journal` | ≥ 1 | journal metadata required |
| `conference` | ≥ 1 | conference + proceedings required |
| `dataset` | ≥ 1 | database title required |

Missing required fields throw a structured `DepositError` (see [Errors](#errors)).

### Batch options

```ts
type BatchOptions = {
  depositor: { name: string; email: string };
  /** Defaults to a generated UUID. */
  id?: string;
  /** Defaults to `"Crossref"`. */
  registrant?: string;
  /** Defaults to `Date.now()`. */
  timestamp?: number;
};
```

### Resource resolution

Every deposited DOI needs a resolving `resource` URL. The SDK does **not** default to Curvenote URLs.

Resolution order for each `doi_data`:

1. Explicit `doi_data.resource` on the item/venue object, or
2. `resourceResolver(context)` if provided, or
3. Error — resource required.

```ts
type ResourceResolver = (ctx: {
  doi: string;
  kind: 'item' | 'journal' | 'issue' | 'proceedings' | 'series' | 'database';
  item?: DepositItem;
}) => { resource: string; pdf?: string; xml?: string; zip?: string };
```

### `DepositItem`

Shared article / paper / dataset record fields:

```ts
type DepositItem = {
  title: string;
  subtitle?: string;
  /** Crossref subtype where applicable (see below). */
  subtype?: string;
  contributors?: ContributorInput[];
  /** Publication / posted date — ISO string or structured date. */
  date?: PublicationDateInput;
  license?: string; // URL
  funding?: FundrefInput[];
  /** Citations keyed by citation key → DOI only. */
  citations?: Record<string, string>;
  pages?: { first_page: string; last_page?: string; other_pages?: string };
  /**
   * Pre-built JATS abstract inner XML or a full `<jats:abstract>...</jats:abstract>`
   * fragment. Typically produced by `abstractFromMdast`.
   */
  abstractJats?: string;
  doi_data: DoiDataInput;
  /** Dataset only — defaults to `"other"` if omitted. */
  dataset_type?: 'record' | 'collection' | 'crossmark_policy' | 'other';
  /** Dataset relations, etc. — extended in implementation as needed. */
  relations?: RelationInput[];
};

type DoiDataInput = {
  doi: string;
  resource?: string;
  pdf?: string;
  xml?: string;
  zip?: string;
};
```

### Subtypes

v1 exposes schema subtypes where Crossref supports them:

| Deposit type | Field | Examples |
|--------------|--------|----------|
| `preprint` (posted content) | `items[0].subtype` | `preprint`, `working_paper`, `report`, `dissertation`, `other`, … |
| `dataset` | `items[].dataset_type` or `subtype` | `record`, `collection`, `crossmark_policy`, `other` |
| `journal` / `conference` | `items[].subtype` where mapped in schema | documented per builder as implemented |

Exact allowed enums are typed in the SDK and validated before XML emit.

### Venue options (sketch)

```ts
type VenueOptions =
  | {
      kind: 'journal';
      title: string;
      abbrevTitle?: string;
      doi_data: DoiDataInput;
      issue?: {
        volume?: string;
        issue?: string;
        doi_data?: DoiDataInput;
        publication_dates?: PublicationDateInput[];
      };
    }
  | {
      kind: 'conference';
      event: {
        name: string;
        acronym?: string;
        number?: string | number;
        date?: string;
        location?: string;
      };
      proceedings: {
        title: string;
        publisher: { name: string };
        publication_date: PublicationDateInput;
        subject?: string;
        doi_data?: DoiDataInput;
      };
      series?: {
        title: string;
        issn: string;
        doi_data?: DoiDataInput;
      };
      /** Proceedings editors / chairs. */
      contributors?: ContributorInput[];
      contributor_role?: 'editor' | 'chair';
    }
  | {
      kind: 'database';
      title: string;
      contributors?: ContributorInput[];
      doi_data?: DoiDataInput;
      description?: string;
    };
```

`venue.kind` should align with `DepositInput.type` (`journal` → `journal`, `conference` → `conference`, `dataset` → `database`).

---

## `validateDeposit`

```ts
function validateDeposit(xml: string): Promise<ValidationResult>;
// sync variant may also be exported if the chosen library allows:
// function validateDepositSync(xml: string): ValidationResult;
```

```ts
type ValidationResult = {
  ok: boolean;
  errors: ValidationIssue[];
};

type ValidationIssue = {
  message: string;
  path?: string;
  line?: number;
  column?: number;
};
```

- Validates deposit XML **in memory** against Crossref XSD **5.3.1** (or an equivalent JS schema binding).
- No temp files, no `xmllint`, no network required at call time (schema is bundled or loaded from package assets).
- Independent of `buildDeposit` — you may validate XML from any source.

The legacy CLI `crossref validate` path (`xmllint`) remains for local use; it is not part of `crossref-utils/sdk`.

---

## `abstractFromMdast`

```ts
function abstractFromMdast(mdast: GenericParent): string;
```

Wraps the same pipeline the CLI uses today after mdast is available:

1. Lightweight transforms (xrefs → links, cites → text, newlines → spaces)
2. `myst-to-jats` serialization
3. Wrap as `jats:abstract`, unwrap `jats:xref`

**Input:** processed MyST mdast for the abstract part (caller already has this from myst-cli or an equivalent pipeline).  
**Output:** JATS XML string suitable for `DepositItem.abstractJats`.

This helper does **not** load files, run myst-cli, or extract parts from a full document — pass the abstract mdast (or part) you already have.

```ts
const abstractJats = abstractFromMdast(abstractPart);
items[0].abstractJats = abstractJats;
```

---

## DOI helpers

### `generateDoi`

```ts
function generateDoi(prefix: string): string;
```

Generates one DOI: `{prefix}/{4 letters}{4 digits}` using an unambiguous alphabet (same logic as today).

`prefix` may be a numeric prefix (`10.62329`) or a known alias from `DOI_PREFIXES`.

### `suggestDois`

```ts
function suggestDois(count: number, prefix: string): string[];
```

Non-interactive helper: returns `count` candidate DOIs via repeated `generateDoi`. Use this when a UI or upstream service wants choices without inquirer.

```ts
const candidates = suggestDois(6, 'curvenote');
// pick one, then set item.doi_data.doi
```

Interactive checkbox selection stays CLI-only (`selectNewDois`).

### `DOI_PREFIXES`

```ts
const DOI_PREFIXES: Readonly<Record<string, string>>;
// e.g. { curvenote: '10.62329', msa: '10.69761', scipy: '10.25080', physiome: '10.36903' }
```

Aliases accepted by `generateDoi` / `suggestDois`. Unknown strings are treated as literal prefixes.

---

## `mystToDepositItem` (optional adapter)

```ts
function mystToDepositItem(
  myst: MystFrontmatterLike,
  opts?: MystAdapterOptions,
): DepositItemPartial;
```

Maps MyST frontmatter-shaped JSON (in memory) into Crossref DTO fields: title, subtitle, contributors, dates, license URL, funding, pages, DOI when present.

- Does **not** touch the filesystem.
- Does **not** build abstracts — set `abstractJats` yourself (e.g. via `abstractFromMdast`).
- Does **not** invent `resource` URLs — combine with `resourceResolver` or set `doi_data` explicitly.
- Venue/journal/conference container fields may be exposed as a sibling helper (`mystToVenue`) if mapping is non-trivial; v1 documents the item mapper first.

This adapter is convenience only. The canonical SDK input remains the Crossref DTO.

---

## Errors

```ts
class DepositError extends Error {
  issues: { code: string; message: string; path?: string }[];
}
```

Thrown by `buildDeposit` for missing required fields, invalid item counts, unresolved resources, or unknown subtypes. `validateDeposit` does not throw for schema failures — it returns `{ ok: false, errors }`.

---

## What the SDK does not do

- Read `myst.yml` / project paths from disk
- Run myst-cli project loading or part extraction
- Prompt for depositor info or DOI selection
- Write DOIs back into config files
- Shell out to `xmllint`

Those remain CLI concerns. A later iteration may rewire the CLI to build DTOs and call this SDK.

---

## Relationship to legacy exports

| Surface | Role |
|---------|------|
| `crossref-utils/sdk` | Supported headless API |
| `crossref-utils` (root) | Legacy `*Xml` builders, `DoiBatch`, `generateDoi`, reader, CLI-oriented validate |

New applications should depend only on `crossref-utils/sdk`.
