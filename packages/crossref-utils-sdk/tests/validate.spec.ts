import { describe, test, expect } from 'vitest';
import { validateDeposit, schemaVersionFromXml } from '../src';

describe('validateDeposit', () => {
  test('rejects malformed XML without needing a real schema', async () => {
    const result = await validateDeposit(
      '<not-closed>',
      '<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"/>',
    );
    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].message).toMatch(/parse/i);
  });

  test('schemaVersionFromXml reads xmlns version', () => {
    expect(
      schemaVersionFromXml('<doi_batch xmlns="http://www.crossref.org/schema/5.4.0"></doi_batch>'),
    ).toBe('5.4.0');
    expect(schemaVersionFromXml('<root/>')).toBe('5.3.1');
  });
});
