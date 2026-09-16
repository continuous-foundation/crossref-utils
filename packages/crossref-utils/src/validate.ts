import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import fetch from 'node-fetch';
import AdmZip from 'adm-zip';

const DEFAULT_XSD_VERSION = '5.3.1';

export type ValidationIssue = {
  message: string;
  path?: string;
  line?: number;
  column?: number;
};

export type ValidationResult = {
  ok: boolean;
  errors: ValidationIssue[];
};

function packageDir() {
  return path.dirname(fileURLToPath(import.meta.url));
}

function schemaCacheDir() {
  return path.join(packageDir(), '..', 'schemas-cache');
}

function xsdFolder() {
  return path.join(schemaCacheDir(), 'schema-master-schemas', 'schemas');
}

function xsdFile(version: string) {
  return `crossref${version}.xsd`;
}

function localXsdFile(version: string) {
  return path.join(xsdFolder(), xsdFile(version));
}

function schemaVersionFromXml(xml: string): string {
  const matches = new RegExp(
    /xmlns="http:\/\/www\.crossref\.org\/schema\/(?<version>[0-9]+\.[0-9]+\.[0-9]+)"/,
  ).exec(xml);
  return matches?.groups?.version ?? DEFAULT_XSD_VERSION;
}

/**
 * Download Crossref XSD schemas into a local cache (once).
 */
export async function ensureSchemas(version: string = DEFAULT_XSD_VERSION): Promise<string> {
  if (fs.existsSync(localXsdFile(version))) return localXsdFile(version);
  fs.mkdirSync(schemaCacheDir(), { recursive: true });
  const url = 'https://gitlab.com/crossref/schema/-/archive/master/schema-master.zip?path=schemas';
  const zipFile = path.join(schemaCacheDir(), 'archive.zip');
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`Failed to download Crossref schemas: ${resp.status} ${resp.statusText}`);
  }
  const buffer = Buffer.from(await resp.arrayBuffer());
  fs.writeFileSync(zipFile, buffer);
  const zip = new AdmZip(zipFile);
  zip.extractAllTo(schemaCacheDir());
  if (!fs.existsSync(localXsdFile(version))) {
    throw new Error(`XSD not found after download: ${localXsdFile(version)}`);
  }
  return localXsdFile(version);
}

/**
 * Validate deposit XML in-process against Crossref XSD (no xmllint).
 */
export async function validateDeposit(xml: string): Promise<ValidationResult> {
  // Fast path: reject malformed XML without downloading schemas
  try {
    const { fromXml } = await import('xast-util-from-xml');
    fromXml(xml);
  } catch (parseErr: any) {
    return {
      ok: false,
      errors: [{ message: `XML parse error: ${parseErr?.message ?? String(parseErr)}` }],
    };
  }

  const version = schemaVersionFromXml(xml);
  let xsdPath: string;
  try {
    xsdPath = await ensureSchemas(version);
  } catch (err) {
    return {
      ok: false,
      errors: [
        {
          message: `Unable to load Crossref XSD ${version}: ${err instanceof Error ? err.message : String(err)}`,
        },
      ],
    };
  }
  const xsdText = fs.readFileSync(xsdPath, 'utf8');

  try {
    const xerces = await import('xerces-wasm');
    const validate = (xerces as any).validate as (
      xmlText: string,
      xsdText: string,
    ) => Promise<{
      valid: boolean;
      parseErrors?: { message: string; line?: number; column?: number }[];
      schemaErrors?: { message: string; line?: number; column?: number }[];
    }>;
    const result = await validate(xml, xsdText);
    const errors: ValidationIssue[] = [
      ...(result.parseErrors ?? []).map((e) => ({
        message: e.message,
        line: e.line,
        column: e.column,
      })),
      ...(result.schemaErrors ?? []).map((e) => ({
        message: e.message,
        line: e.line,
        column: e.column,
      })),
    ];
    return { ok: !!result.valid && errors.length === 0, errors };
  } catch (err) {
    return {
      ok: false,
      errors: [
        {
          message: `XSD engine unavailable (${err instanceof Error ? err.message : String(err)}). Schema cached at ${xsdPath}; ensure xerces-wasm is installed.`,
        },
      ],
    };
  }
}
