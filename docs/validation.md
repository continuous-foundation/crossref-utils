# Deposit XML validation

`crossref-utils` exposes **`validateDeposit(xml: string)`** for in-process Crossref XSD checks (no `xmllint`, no shelling out).

## How it works

1. **Well-formedness** — parse with `xast-util-from-xml`. Malformed XML fails fast (no schema download).
2. **Schema load** — resolve Crossref schema version from the XML `xmlns` (default **5.3.1**), then `ensureSchemas()` downloads the Crossref schema zip from GitLab once into a local `schemas-cache/` (gitignored).
3. **XSD validate** — run the deposit XML against the cached XSD via **[xerces-wasm](https://www.npmjs.com/package/xerces-wasm)** (Apache Xerces-C++ compiled to WebAssembly).

Return shape:

```ts
{ ok: boolean; errors: { message: string; line?: number; column?: number }[] }
```

The CLI `crossref validate <file>` reads the file and calls the same API.

## Why xerces-wasm?

Earlier tooling fell back to **`xmllint`** (native CLI, awkward in CI/serverless). Pure-JS XSD options are sparse or unmaintained. **xerces-wasm** gives real XSD 1.0 validation without Node native addons (`node-gyp`), using a WASM binary instead.

Dependency: `xerces-wasm@^2` (`engines.node: >=18`).

## Runtime support: Node, serverless, browser?

| Environment | xerces-wasm itself | Our `validateDeposit` today |
|-------------|--------------------|-----------------------------|
| **Node.js ≥ 18** | Supported (primary target; ships `main` + `.wasm`) | Supported |
| **Vercel / other Node serverless** | Generally yes — WASM runs in Node serverless if the `.wasm` asset is available to the function | **Mostly yes for the engine**, but see caveats below |
| **Browser** | Possible (project has a [browser playground](https://harshanacz.github.io/xerces-playground/)) | **Not supported as-is** — our wrapper uses `node:fs`, `node-fetch`, and a disk cache |

**Short answer:** xerces-wasm is **not browser-only**. It is a **WASM build of Xerces** meant for **Node and the browser**. Our library API is **Node-first** (and intended for serverless Node such as Vercel functions).

### Vercel / serverless caveats

- **Bundle the WASM file** — ensure `node_modules/xerces-wasm/wasm/*.wasm` is included in the function output (Vercel usually includes `node_modules`; watch file-size limits).
- **Schema cache + network** — first call may download schemas to disk. On read-only or ephemeral filesystems, prefer **vendoring Crossref XSD files** into the package (or an immutable cache) so cold starts do not depend on GitLab.
- **Cold start** — first WASM module init + XSD compile is heavier than subsequent validates; `createProjectValidator` (xerces API) can cache a grammar pool across requests in a warm isolate.
- **Crossref multi-file XSDs** — the official schema `include`s other files. Passing only the main XSD text may miss imports; a follow-up should use xerces **schema bundles** / `validateFiles` with the full `schemas/` directory.

## Limitations / follow-ups

- Schemas are downloaded on demand, not yet shipped inside the npm tarball.
- Full Crossref schema-set wiring (all includes) should be hardened before relying on this for production deposit gates.
- Browser validation would need a separate entry that takes XSD text/bundles and does not touch the filesystem.
