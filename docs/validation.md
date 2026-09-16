# Deposit XML validation

## Responsibility split

| Layer | Role |
|-------|------|
| **`crossref-utils` (SDK)** | `validateDeposit(xml, schema)` — in-process XSD check via xerces-wasm. **No network, no schema download.** Caller must pass schema text / bundle. |
| **`crossref-cli` (or your app)** | Obtain schemas (download, vendor, or cache), pick version, pass a `DepositSchema` into the SDK. |

That lets the CLI keep **multi-version** support (resolve version from deposit `xmlns`, load matching files from a cached Crossref `schemas/` tree), while another app can **vendor a single bundle** (e.g. 5.5.0) for the XML it produces.

## SDK API

```ts
import { validateDeposit, schemaVersionFromXml, type DepositSchema } from 'crossref-utils';

// Prefer a bundle so includes/imports resolve (common*.xsd, fundref, JATS, …)
const schema: DepositSchema = {
  entry: crossrefXsdText,           // e.g. contents of crossref5.3.1.xsd
  imports: { 'common5.3.1.xsd': commonText, 'fundref.xsd': fundrefText, /* … */ },
};

const { ok, errors } = await validateDeposit(xml, schema);
```

`schemaVersionFromXml(xml)` reads `xmlns="http://www.crossref.org/schema/X.Y.Z"` (default `5.3.1`) so hosts can choose which bundle to load.

A bare `string` entry is accepted but is usually **incomplete** for full Crossref validation (the main XSD includes/imports many files).

## CLI behavior

`crossref validate <file>`:

1. Reads the deposit XML  
2. Downloads the Crossref GitLab `schemas/` zip **once** into `~/.cache/crossref-cli/schemas/` (if missing)  
3. Builds a `DepositSchema` bundle for the XML’s schema version  
4. Calls `validateDeposit(xml, schema)`

## Why xerces-wasm?

Real XSD 1.0 validation without native `node-gyp` addons or shelling to `xmllint`. See [xerces-wasm](https://www.npmjs.com/package/xerces-wasm) (`engines.node: >=18`). WASM runs on **Node** and can run in the **browser**; our SDK API is environment-agnostic as long as you pass schema text in memory.

### Serverless (e.g. Vercel)

- Pass a **vendored** `DepositSchema` (no GitLab download in the function).  
- Ensure `xerces-wasm`’s `.wasm` asset is included in the function bundle.  
- Cold start: first WASM + XSD compile is heavier; warm isolates help.

## Crossref schema versions

Builders/`DoiBatch` currently emit **5.3.1**. Crossref’s current recommended deposit schema is **5.5.0** ([schema versions](https://www.crossref.org/documentation/schema-library/schema-versions/)). History and files: [gitlab.com/crossref/schema](https://gitlab.com/crossref/schema). Updates are irregular (roughly a few notable bumps per year recently).
