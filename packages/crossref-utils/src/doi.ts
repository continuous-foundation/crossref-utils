import { customAlphabet } from 'nanoid';
import type { DoiData } from './types.js';

// For letters and numbers that conflict, the letters were eliminated:
// 0 not O/Q, 1 not I/L, 2 not Z, 5 not S, 8 not B
const alpha = 'acdefghjkmnprtuvwxy';
const numbers = '23456789';
const nanoidAZ = customAlphabet(alpha, 4);
const nanoidAZ9 = customAlphabet(numbers, 4);

/**
 * Generate a DOI suffix: `{prefix}/{4 letters}{4 digits}`.
 * Pass a numeric DOI prefix (e.g. `10.62329`); aliases belong in caller config.
 * Always human-review before submitting to Crossref.
 */
export function generateDoi(prefix: string) {
  return `${prefix}/${nanoidAZ()}${nanoidAZ9()}`;
}

/**
 * Non-interactive DOI candidates for a UI or review step.
 */
export function suggestDois(count: number, prefix: string): string[] {
  return Array.from({ length: count }, () => generateDoi(prefix));
}

/**
 * Resolve DOI + landing-page resource for deposit `doi_data`.
 * Callers must supply resource URLs — the library does not default to Curvenote.
 */
export type DoiDataResolver = (doi: string) => DoiData;

export function resolveDoiData(
  doi: string | undefined,
  resolver?: DoiDataResolver,
): DoiData | undefined {
  if (!doi) return undefined;
  if (!resolver) {
    throw new Error(
      `DOI resource resolver required for DOI "${doi}". Pass resolveDoiData: (doi) => ({ doi, resource: "https://..." }).`,
    );
  }
  return resolver(doi);
}
