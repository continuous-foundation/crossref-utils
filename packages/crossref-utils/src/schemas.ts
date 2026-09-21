import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import fetch from 'node-fetch';
import AdmZip from 'adm-zip';
import type { DepositSchema } from 'crossref-utils-sdk';
import { schemaVersionFromXml } from 'crossref-utils-sdk';

const SCHEMA_ZIP_URL =
  'https://gitlab.com/crossref/schema/-/archive/master/schema-master.zip?path=schemas';

function schemaCacheRoot() {
  return path.join(os.homedir(), '.cache', 'crossref-utils', 'schemas');
}

function schemasDir() {
  return path.join(schemaCacheRoot(), 'schema-master-schemas', 'schemas');
}

/**
 * Download the full Crossref `schemas/` tree once into a user cache directory.
 */
export async function ensureSchemaCache(log?: {
  info: (m: string) => void;
  debug: (m: string) => void;
}): Promise<string> {
  const dir = schemasDir();
  if (fs.existsSync(dir) && fs.readdirSync(dir).some((f) => f.startsWith('crossref'))) {
    return dir;
  }
  const root = schemaCacheRoot();
  fs.mkdirSync(root, { recursive: true });
  const zipFile = path.join(root, 'archive.zip');
  log?.info(`🌎 Downloading Crossref schemas: ${SCHEMA_ZIP_URL}`);
  const resp = await fetch(SCHEMA_ZIP_URL);
  if (!resp.ok) {
    throw new Error(`Failed to download Crossref schemas: ${resp.status} ${resp.statusText}`);
  }
  fs.writeFileSync(zipFile, Buffer.from(await resp.arrayBuffer()));
  log?.debug(`Unzipping to ${root}`);
  new AdmZip(zipFile).extractAllTo(root);
  if (!fs.existsSync(dir)) {
    throw new Error(`Schemas folder missing after download: ${dir}`);
  }
  return dir;
}

/**
 * Load an in-memory schema bundle for a deposit version from a schemas directory.
 */
export function loadSchemaBundle(schemasDirectory: string, version: string): DepositSchema {
  const entryName = `crossref${version}.xsd`;
  const entryPath = path.join(schemasDirectory, entryName);
  if (!fs.existsSync(entryPath)) {
    throw new Error(`Schema not found: ${entryPath}`);
  }
  const imports: Record<string, string> = {};
  for (const name of fs.readdirSync(schemasDirectory)) {
    const full = path.join(schemasDirectory, name);
    if (!fs.statSync(full).isFile()) continue;
    // Skip non-schema junk; xerces keys imports by the schemaLocation filename
    if (!/\.(xsd|dtd|xml)$/i.test(name)) continue;
    imports[name] = fs.readFileSync(full, 'utf8');
  }
  return {
    entry: imports[entryName] ?? fs.readFileSync(entryPath, 'utf8'),
    imports,
  };
}

/**
 * Resolve schema version from deposit XML, ensure cache, return a bundle for validateDeposit.
 */
export async function schemaBundleForDepositXml(
  xml: string,
  log?: { info: (m: string) => void; debug: (m: string) => void },
): Promise<{ version: string; schema: DepositSchema }> {
  const version = schemaVersionFromXml(xml);
  const dir = await ensureSchemaCache(log);
  return { version, schema: loadSchemaBundle(dir, version) };
}
