import { describe, test, expect } from 'vitest';
import { u } from 'unist-builder';
import { toXml } from 'xast-util-to-xml';
import { publicationDateXml } from '../src';
import { element2JatsUnist, unwrapJatsXrefElements } from '../src/cli/utils.js';
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

describe('element2JatsUnist', () => {
  test('converts inline math with tex-math CDATA and MathML', () => {
    const jats = [
      {
        type: 'element' as const,
        name: 'p',
        attributes: {},
        elements: [
          { type: 'text' as const, text: 'accuracy (' },
          {
            type: 'element' as const,
            name: 'inline-formula',
            attributes: {},
            elements: [
              {
                type: 'element' as const,
                name: 'alternatives',
                elements: [
                  {
                    type: 'element' as const,
                    name: 'mml:math',
                    attributes: { display: 'inline' },
                    elements: [
                      {
                        type: 'element' as const,
                        name: 'mml:mo',
                        elements: [{ type: 'text' as const, text: '>' }],
                      },
                    ],
                  },
                  {
                    type: 'element' as const,
                    name: 'tex-math',
                    elements: [{ type: 'cdata' as const, cdata: '\\gt' }],
                  },
                ],
              },
            ],
          },
          { type: 'text' as const, text: '98.5%), using both types.' },
        ],
      },
    ];
    const abstract = u(
      'element',
      { name: 'jats:abstract' },
      jats.map((e) => element2JatsUnist(e)),
    ) as Element;
    const xml = toXml(abstract);
    expect(xml).toContain('<mml:math display="inline"><mml:mo>></mml:mo></mml:math>');
    expect(xml).toContain('<jats:tex-math><![CDATA[\\gt]]></jats:tex-math>');
    expect(xml).toContain('98.5%), using both types.');
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
