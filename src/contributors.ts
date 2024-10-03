import type { Element } from 'xast';
import { isUrl } from 'myst-cli-utils';
import type { Contributor, PageFrontmatter } from 'myst-frontmatter';
import { e } from './utils.js';
import type { ContributorOptions } from './types.js';

export function contributorXml(opts: ContributorOptions) {
  const { sequence, contributor_role, nameParsed, affiliations = [], orcid } = opts;
  const contribChildren: Element[] = [
    e('given_name', nameParsed.given),
    e('surname', nameParsed.family),
  ];
  if (affiliations.length) {
    contribChildren.push(
      e(
        'affiliations',
        affiliations.map((aff) => {
          const affChildren: Element[] = [e('institution_name', aff.name || aff.institution)];
          // These would be nicer with ROR/ISNI utils library
          if (aff.ror) {
            const normalizedRor = isUrl(aff.ror) ? aff.ror : `https://ror.org/${aff.ror}`;
            affChildren.push(e('institution_id', { type: 'ror' }, normalizedRor));
          }
          if (aff.isni) {
            const normalizedIsni = isUrl(aff.isni) ? aff.isni : `https://isni.org/isni/${aff.isni}`;
            affChildren.push(e('institution_id', { type: 'isni' }, normalizedIsni));
          }
          if (aff.city) affChildren.push(e('institution_place', aff.city));
          if (aff.state) affChildren.push(e('institution_place', aff.state));
          if (aff.country) affChildren.push(e('institution_place', aff.country));
          if (aff.department) affChildren.push(e('institution_department', aff.department));
          return e('institution', affChildren);
        }),
      ),
    );
  }
  if (orcid) {
    contribChildren.push(e('ORCID', `https://orcid.org/${orcid}`));
  }
  contribChildren.push(e('alt-name', [e('string-name', nameParsed.literal)]));
  return e('person_name', { sequence, contributor_role }, contribChildren);
}

function isFirstAuthor(index: number, authors: { equal_contributor?: boolean }[]): boolean {
  if (index === 0) return true;
  return !!authors[index]?.equal_contributor && isFirstAuthor(index - 1, authors);
}

export function contributorsXmlFromMystAuthors(
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
        sequence: isFirstAuthor(index, authors) ? 'first' : 'additional',
        contributor_role: opts?.contributor_role ?? 'author',
      }),
    ),
  );
}

export function contributorsXmlFromMystEditors(myst: PageFrontmatter): Element | undefined {
  const editors =
    myst.editors
      ?.map((editor) => myst.contributors?.find(({ id }) => editor === id))
      .filter((editor): editor is Contributor => !!editor)
      .map((editor) => ({
        ...editor,
        affiliations: editor.affiliations?.map((aff) =>
          myst.affiliations?.find((test) => test.id === aff),
        ),
      })) ?? [];
  if (editors.length === 0) return;
  return e(
    'contributors',
    editors.map((editor, index) =>
      contributorXml({
        ...(editor as ContributorOptions),
        sequence: index === 0 ? 'first' : 'additional',
        contributor_role: 'editor',
      }),
    ),
  );
}
