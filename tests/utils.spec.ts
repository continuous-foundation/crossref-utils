import { describe, test, expect } from 'vitest';
import { toXml } from 'xast-util-to-xml';
import { publicationDateXml } from '../src';
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
