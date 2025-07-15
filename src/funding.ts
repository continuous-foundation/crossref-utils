import type { Award, ProjectFrontmatter } from 'myst-frontmatter';
import type { Fundref } from './types.js';
import type { ISession } from 'myst-cli-utils';
import { e, t } from './utils.js';

export function fundrefFromMyst(
  session: ISession,
  frontmatter: ProjectFrontmatter,
): Fundref[] | undefined {
  const { funding, affiliations } = frontmatter;
  if (!funding?.length) return;
  const allAwards: Award[] = funding
    .map(({ awards }) => awards)
    .flat()
    .filter((award): award is Award => {
      if (!award) return false;
      const sources = award?.sources ?? [];
      if (sources.length === 0) {
        session.log.warn(`To be included in CrossRef, awards must have a source.`);
        return false;
      }
      return true;
    });
  return allAwards.map(({ id, sources: sourceIds }) => {
    const sources = sourceIds!.map((sourceId) => {
      const affiliation = affiliations?.find((aff) => aff.id === sourceId);
      if (!affiliation) throw new Error(`unable to find affiliation for id "${sourceId}"`);
      const { name, institution, doi } = affiliation;
      const resolvedName = name ?? institution;
      if (!resolvedName) {
        throw new Error(`all award sources must have a name; no name or id "${sourceId}"`);
      }
      return { name: resolvedName, identifiers: doi ? [doi] : [] };
    });
    const awardNumbers = id ? [id] : [];
    return { sources, awardNumbers };
  });
}

export function createFundingXml(funding?: Fundref[]) {
  if (!funding || funding.length === 0) return null;
  return e(
    'fr:program',
    { name: 'fundref' },
    funding.map((fundingItem) => {
      if (!fundingItem.sources.length) {
        throw new Error('Fundref entry must have at least one source');
      }
      return e('fr:assertion', { name: 'fundgroup' }, [
        ...fundingItem.sources.map((source) => {
          return e('fr:assertion', { name: 'funder_name' }, [
            t(source.name),
            ...source.identifiers.map((id) => {
              return e('fr:assertion', { name: 'funder_identifier' }, id);
            }),
          ]);
        }),
        ...fundingItem.awardNumbers.map((awardNumber) => {
          return e('fr:assertion', { name: 'award_number' }, awardNumber);
        }),
      ]);
    }),
  );
}
