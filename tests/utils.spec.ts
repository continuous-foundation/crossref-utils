import { describe, test, expect } from 'vitest';
import { u } from 'unist-builder';
import { toXml } from 'xast-util-to-xml';
import { publicationDateXml } from '../src';
import { unwrapJatsXrefElements } from '../src/cli/utils.js';
import type { Element } from 'xast';

describe('CrossRef Utilities', () => {
  test.each([
    [
      new Date('2023/12/5'),
      '<publication_date media_type="online"><month>12</month><day>05</day><year>2023</year></publication_date>',
    ],
    [
      { year: 2023, month: 12, day: 5 },
      '<publication_date media_type="online"><month>12</month><day>05</day><year>2023</year></publication_date>',
    ],
    [{ year: 2023, month: 12, day: 45 }, null],
    [{ year: 2023, month: 0, day: 5 }, null],
    [{ year: 2023, month: 'Nov', day: 4 }, null], // Could maybe support this in the future
    [{ year: 2023 }, '<publication_date media_type="online"><year>2023</year></publication_date>'],
    [
      { year: 2023, month: 5 },
      '<publication_date media_type="online"><month>05</month><year>2023</year></publication_date>',
    ],
  ])('publication date %s', async (date, xml) => {
    if (xml == null) {
      expect(() => publicationDateXml(date)).toThrow();
    } else {
      expect(toXml(publicationDateXml(date) as Element)).toBe(xml);
    }
  });
});

describe('unwrapJatsXrefElements', () => {
  test('removes jats:xref wrapper, keeps children', () => {
    const tree = u('element', { name: 'jats:p', attributes: {} }, [
      u('text', 'See '),
      u('element', { name: 'jats:xref', attributes: { 'ref-type': 'fig', rid: 'f1' } }, [
        u('element', { name: 'jats:bold', attributes: {} }, [u('text', 'Figure 1')]),
      ]),
      u('text', ' for details.'),
    ]) as Element;
    const out = unwrapJatsXrefElements(tree);
    const xml = toXml(out);
    expect(xml).not.toContain('xref');
    expect(xml).toContain('Figure 1');
    expect(xml).toContain('See ');
    expect(xml).toContain('for details.');
  });

  test('unwraps nested jats:xref', () => {
    const tree = u('element', { name: 'jats:p', attributes: {} }, [
      u('element', { name: 'jats:xref', attributes: {} }, [
        u('element', { name: 'jats:xref', attributes: {} }, [u('text', 'inner')]),
      ]),
    ]) as Element;
    const out = unwrapJatsXrefElements(tree);
    expect(toXml(out)).toBe('<jats:p>inner</jats:p>');
  });
});
