import { describe, test, expect } from 'vitest';
import { validateDeposit } from '../src';

describe('validateDeposit', () => {
  test('rejects malformed XML without downloading schemas', async () => {
    const result = await validateDeposit('<not-closed>');
    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].message).toMatch(/parse/i);
  });
});
