/**
 * In-memory Crossref schema set for validation.
 * Callers (CLI or app) supply these — the library does not download schemas.
 *
 * Prefer a bundle with `imports` so `xsd:include` / `xsd:import` resolve
 * (common*.xsd, fundref, JATS, etc.). A bare entry string alone is usually incomplete.
 */
export type DepositSchema =
  | string
  | {
      /** Main schema document text, e.g. contents of `crossref5.3.1.xsd`. */
      entry: string;
      /** Map of schema filename → file text for includes/imports. */
      imports?: Record<string, string>;
    };

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

const DEFAULT_XSD_VERSION = '5.3.1';

/**
 * Read Crossref schema version from deposit XML `xmlns`, or default to 5.3.1.
 * Useful for CLIs / apps that resolve which schema bundle to load.
 */
export function schemaVersionFromXml(xml: string, fallback = DEFAULT_XSD_VERSION): string {
  const matches = new RegExp(
    /xmlns="http:\/\/www\.crossref\.org\/schema\/(?<version>[0-9]+\.[0-9]+\.[0-9]+)"/,
  ).exec(xml);
  return matches?.groups?.version ?? fallback;
}

/**
 * Validate deposit XML in-process against a caller-supplied XSD (or schema bundle).
 * No network and no filesystem access.
 */
export async function validateDeposit(
  xml: string,
  schema: DepositSchema,
): Promise<ValidationResult> {
  try {
    const { fromXml } = await import('xast-util-from-xml');
    fromXml(xml);
  } catch (parseErr: any) {
    return {
      ok: false,
      errors: [{ message: `XML parse error: ${parseErr?.message ?? String(parseErr)}` }],
    };
  }

  try {
    const xerces = await import('xerces-wasm');
    const validate = xerces.validate as (
      xmlText: string,
      xsd: string | { entry: string; imports?: Record<string, string> },
    ) => Promise<{
      valid: boolean;
      parseErrors?: { message: string; line?: number; column?: number }[];
      schemaErrors?: { message: string; line?: number; column?: number }[];
    }>;

    const xsdInput =
      typeof schema === 'string' ? schema : { entry: schema.entry, imports: schema.imports };

    const result = await validate(xml, xsdInput);
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
          message: `XSD engine unavailable (${err instanceof Error ? err.message : String(err)}). Ensure xerces-wasm is installed.`,
        },
      ],
    };
  }
}
