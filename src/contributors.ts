import type { Element } from 'xast';
import { e } from './utils.js';
import type { ContributorOptions } from './types.js';
import type { PageFrontmatter } from 'myst-frontmatter';

export function contributorXml(opts: ContributorOptions) {
  const { sequence, contributor_role, nameParsed, affiliations = [], orcid } = opts;
  return e('person_name', { sequence, contributor_role }, [
    e('given_name', nameParsed.given),
    e('surname', nameParsed.family),
    ...affiliations.map((aff) => e('affiliation', aff.name || aff.institution)),
    orcid ? e('ORCID', `https://orcid.org/${orcid}`) : undefined,
    e('alt-name', [e('string-name', nameParsed.literal)]),
  ]);
}

export function contributorsXmlFromMyst(
  myst: PageFrontmatter,
  opts?: { contributor_role?: ContributorOptions['contributor_role'] },
): Element | undefined {
  const authors =
    myst.authors?.map((a) => ({
      ...a,
      affiliations: a.affiliations?.map((aff) =>
        myst.affiliations?.find((test) => test.id === aff),
      ),
    })) ?? [];
  if (authors.length === 0) return;
  return e(
    'contributors',
    authors.map((author, index) =>
      contributorXml({
        ...(author as ContributorOptions),
        sequence: index === 0 ? 'first' : 'additional',
        contributor_role: opts?.contributor_role ?? 'author',
      }),
    ),
  );
}
