import type { Award, ProjectFrontmatter } from 'myst-frontmatter';
import type { Fundref } from './types.js';
import type { ISession } from 'myst-cli-utils';

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
