# CLI end-to-end fixtures

Regression fixtures for `crossref deposit` (and later `validate`). Kept **compact and owned** by this repo — shaped like SciPy proceedings papers, not wholesale copies of [scipy_proceedings/papers](https://github.com/scipy-conference/scipy_proceedings/tree/2025/papers).

## Goals

- Exercise real CLI → MyST load → deposit XML path
- Capture **golden XML from `main`** for regression against refactors (e.g. monorepo split)
- Stay small and maintainable (&lt; ~100KB text)
- Run **offline and deterministically** — see [Citations](#citations) below

## Citations

Cited works are declared in a local `references.bib` next to each fixture and referenced as
`[@Key]`. They are deliberately **not** written as `[](doi:...)` links.

A bare `doi:` link makes myst-cli resolve the DOI over the network and derive the citation key
from the `id` field of whatever CSL JSON comes back. That key is not stable across environments —
the same fixture produced `LeCun_2015` locally and `LeCun2015Deep` in CI, which failed the golden
comparison during a release. DOI resolution is a myst-cli/citation-js concern, not something this
project produces, so the fixtures pin it rather than test it.

Keep it that way: no fixture should need the network. If you add a cited work, add a `.bib` entry
with a `DOI` field. To check nothing reaches out, delete `_build/` and run the suite — myst-cli
caches every DOI fetch in `_build/cache/doi-*.csl.json`, so that directory staying empty means no
lookups happened.

## Layout

```
packages/crossref-utils-sdk/tests/fixtures/
  shared/
    proceedings.yml          # SciPy-like venue / volume / editors (synthetic)
  conference/
    paper-a/                 # ORCID, affiliations, pages, abstract, DOI cites
      references.bib         # local bibliography (see Citations)
    paper-b/                 # equal_contributor, funding, subtitle
  journal/
    article/
      references.bib
  preprint/
    article/
  dataset/
    item/
  golden/                    # Normalized XML baselines
    conference.xml
    journal.xml
    preprint.xml
    dataset.xml
```

## Coverage matrix

| Fixture                          | `--type`     | What it covers                                                                                              |
| -------------------------------- | ------------ | ----------------------------------------------------------------------------------------------------------- |
| `conference/paper-a` + `paper-b` | `conference` | Multi-paper batch, venue/volume/editors, pages, abstract, ORCID, funding, equal contributors, DOI citations |
| `journal/article`                | `journal`    | Journal title/DOI, volume/issue                                                                             |
| `preprint/article`               | `preprint`   | Standalone posted content                                                                                   |
| `dataset/item`                   | `dataset`    | Database venue + dataset record                                                                             |

## Design choices

- **From scratch** (not vendored SciPy trees): flatten `extends`, no images/templates, fake names/emails/ORCIDs.
- **DOIs always present** in frontmatter so deposits are non-interactive (no DOI checkbox prompts).
- **Stable batch id** via `--id` in tests; **normalize** `timestamp` (and any remaining UUIDs) before comparing to goldens.
- Depositor flags use CLI defaults or explicit `--name` / `--email` / `--registrant`.

## Running

```bash
npm test                  # unit + e2e (builds CLI for e2e)
npm run test:unit         # unit only
npm run test:e2e          # e2e only (builds CLI first)
npm run test:e2e:record   # regenerates packages/crossref-utils-sdk/tests/fixtures/golden/*.xml
```

`test:e2e:record` should only be used intentionally (e.g. when deposit XML shape changes on purpose).

## Out of scope (v1)

- Inquirer / path-discovery flows
- DOI generation UI
- Submodule clone of full SciPy proceedings
- Schema validation e2e (separate; needs schema bundles)
