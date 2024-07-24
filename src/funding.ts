import type { Award, ProjectFrontmatter } from 'myst-frontmatter';
import type { Fundref } from './types.js';

export function fundrefFromMyst(frontmatter: ProjectFrontmatter): Fundref[] | undefined {
  const { funding, affiliations } = frontmatter;
  if (!funding?.length) return;
  const allAwards: Award[] = funding
    .map(({ awards }) => awards)
    .flat()
    .filter((award): award is Award => !!award);
  return allAwards.map(({ id, sources: sourceIds }) => {
    if (!sourceIds?.length) throw new Error(`all awards must have a source`);
    const sources = sourceIds.map((sourceId) => {
      const affiliation = affiliations?.find((aff) => aff.id === sourceId);
      if (!affiliation) throw new Error(`unable to find affiliation for id "${sourceId}"`);
      const { name, institution, doi } = affiliation;
      const resolvedName = name ?? institution;
      if (!resolvedName)
        throw new Error(`all award sources must have a name; no name or id "${sourceId}"`);
      return { name: resolvedName, identifiers: doi ? [doi] : [] };
    });
    const awardNumbers = id ? [id] : [];
    return { sources, awardNumbers };
  });
}
