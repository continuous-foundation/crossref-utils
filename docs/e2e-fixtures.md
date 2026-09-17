# CLI end-to-end fixtures

Regression fixtures for `crossref deposit` (and later `validate`). Kept **compact and owned** by this repo — shaped like SciPy proceedings papers, not wholesale copies of [scipy_proceedings/papers](https://github.com/scipy-conference/scipy_proceedings/tree/2025/papers).

## Goals

- Exercise real CLI → MyST load → deposit XML path
- Capture **golden XML from `main`** for regression against refactors (e.g. monorepo split)
- Stay small and maintainable (&lt; ~100KB text)

## Layout

```
packages/crossref-utils/tests/fixtures/
  shared/
    proceedings.yml          # SciPy-like venue / volume / editors (synthetic)
  conference/
    paper-a/                 # ORCID, affiliations, pages, abstract, DOI cites
    paper-b/                 # equal_contributor, funding, subtitle
  journal/
    article/
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
npm run test:e2e:record   # regenerates packages/crossref-utils/tests/fixtures/golden/*.xml
```


`test:e2e:record` should only be used intentionally (e.g. when deposit XML shape changes on purpose).

## Out of scope (v1)

- Inquirer / path-discovery flows
- DOI generation UI
- Submodule clone of full SciPy proceedings
- Schema validation e2e (separate; needs schema bundles)
