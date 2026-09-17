import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, test, expect, beforeAll } from 'vitest';

const packageRoot = process.cwd();
const fixturesRoot = path.join(packageRoot, 'tests/fixtures');
const goldenRoot = path.join(fixturesRoot, 'golden');
const cliBin = path.join(packageRoot, '../crossref-cli/dist/crossref.cjs');
const repoRoot = path.join(packageRoot, '../..');

const RECORD = process.env.RECORD_GOLDEN === '1';

/** Strip nondeterministic deposit head fields for stable comparisons. */
export function normalizeDepositXml(xml: string): string {
  return xml
    .replace(/<doi_batch_id>[^<]*<\/doi_batch_id>/g, '<doi_batch_id>FIXED_BATCH_ID</doi_batch_id>')
    .replace(/<timestamp>[^<]*<\/timestamp>/g, '<timestamp>0</timestamp>')
    .replace(/\r\n/g, '\n')
    .trim();
}

function runDeposit(args: string[]): string {
  const result = spawnSync(process.execPath, [cliBin, 'deposit', ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: { ...process.env, NO_COLOR: '1' },
  });
  if (result.status !== 0) {
    throw new Error(
      `crossref deposit failed (${result.status}):\n${result.stdout}\n${result.stderr}`,
    );
  }
  return result.stdout;
}

function depositToNormalizedXml(args: string[]): string {
  const outFile = path.join(fixturesRoot, '.tmp-deposit.xml');
  try {
    runDeposit([...args, '--id', 'FIXED_BATCH_ID', '-o', outFile]);
    const xml = fs.readFileSync(outFile, 'utf8');
    return normalizeDepositXml(xml);
  } finally {
    if (fs.existsSync(outFile)) fs.unlinkSync(outFile);
  }
}

function assertOrRecord(name: string, actual: string) {
  const goldenPath = path.join(goldenRoot, name);
  if (RECORD) {
    fs.mkdirSync(goldenRoot, { recursive: true });
    fs.writeFileSync(goldenPath, `${actual}\n`);
    return;
  }
  if (!fs.existsSync(goldenPath)) {
    throw new Error(`Missing golden ${goldenPath}. Run with RECORD_GOLDEN=1 to create baselines.`);
  }
  const expected = normalizeDepositXml(fs.readFileSync(goldenPath, 'utf8'));
  expect(actual).toBe(expected);
}

describe('CLI e2e deposit fixtures', () => {
  beforeAll(() => {
    if (!fs.existsSync(cliBin)) {
      throw new Error(`CLI not built: ${cliBin}. Run npm run build first.`);
    }
  });

  test('conference multi-paper deposit', () => {
    const paperA = path.join(fixturesRoot, 'conference/paper-a');
    const paperB = path.join(fixturesRoot, 'conference/paper-b');
    const actual = depositToNormalizedXml([
      '--type',
      'conference',
      '--name',
      'Fixture Depositor',
      '--email',
      'depositor@example.org',
      paperA,
      paperB,
    ]);
    assertOrRecord('conference.xml', actual);
    expect(actual).toContain('conference_paper');
    expect(actual).toContain('10.99999/fixture.paper-a');
    expect(actual).toContain('10.99999/fixture.paper-b');
  }, 120000);

  test('journal deposit', () => {
    const article = path.join(fixturesRoot, 'journal/article');
    const actual = depositToNormalizedXml([
      '--type',
      'journal',
      '--name',
      'Fixture Depositor',
      '--email',
      'depositor@example.org',
      article,
    ]);
    assertOrRecord('journal.xml', actual);
    expect(actual).toContain('journal_article');
    expect(actual).toContain('10.99999/fixture.journal-article');
  }, 120000);

  test('preprint deposit', () => {
    const article = path.join(fixturesRoot, 'preprint/article');
    const actual = depositToNormalizedXml([
      '--type',
      'preprint',
      '--name',
      'Fixture Depositor',
      '--email',
      'depositor@example.org',
      article,
    ]);
    assertOrRecord('preprint.xml', actual);
    expect(actual).toContain('posted_content');
    expect(actual).toContain('10.99999/fixture.preprint');
  }, 120000);

  test('dataset deposit', () => {
    const item = path.join(fixturesRoot, 'dataset/item');
    const actual = depositToNormalizedXml([
      '--type',
      'dataset',
      '--name',
      'Fixture Depositor',
      '--email',
      'depositor@example.org',
      item,
    ]);
    assertOrRecord('dataset.xml', actual);
    expect(actual).toContain('dataset');
    expect(actual).toContain('10.99999/fixture.dataset');
  }, 120000);
});
