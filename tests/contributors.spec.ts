import { describe, test, expect } from 'vitest';
import { toXml } from 'xast-util-to-xml';
import type { PageFrontmatter } from 'myst-frontmatter';
import { contributorsXmlFromMystEditors } from '../src/contributors.js';

describe('contributorsXmlFromMystEditors', () => {
  const baseMyst = {
    editors: ['ed1'],
    contributors: [
      {
        id: 'ed1',
        nameParsed: { given: 'Pat', family: 'Organizer', literal: 'Pat Organizer' },
      },
    ],
  } as unknown as PageFrontmatter;

  test('defaults myst editors to Crossref contributor_role editor', () => {
    const el = contributorsXmlFromMystEditors(baseMyst);
    expect(toXml(el!)).toContain('contributor_role="editor"');
  });

  test('supports chair role for proceedings editors', () => {
    const el = contributorsXmlFromMystEditors(baseMyst, { contributor_role: 'chair' });
    expect(toXml(el!)).toContain('contributor_role="chair"');
  });
});
