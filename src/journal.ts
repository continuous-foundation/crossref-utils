import type { Element } from 'xast';
import { e, t } from './utils.js';
import type { JournalArticle, JournalIssue, JournalMetadata } from './types.js';
import { publicationDateXml } from './dates.js';
import type { ProjectFrontmatter } from 'myst-frontmatter';
import { contributorsXmlFromMyst } from './contributors.js';
import { normalize } from 'doi-utils';
import { fundrefFromMyst } from './funding.js';
import type { ISession } from 'myst-cli-utils';

/**
 * Create journal_metadata xml
 *
 * Required fields: title
 * Optional fields: abbrevTitle, doi_data
 * Missing fields: issn, coden, archive_locations
 */
export function journalMetadataXml({ title, abbrevTitle, doi_data }: JournalMetadata) {
  if (!title) throw new Error('Missing required frontmatter field: title');
  const children: Element[] = [e('full_title', title)];
  if (abbrevTitle) children.push(e('abbrev_title', abbrevTitle));
  // issn
  // coden
  // archive_locations
  if (doi_data?.doi) {
    const doiChildren = [e('doi', doi_data.doi)];
    if (doi_data.resource) {
      doiChildren.push(e('resource', { content_version: 'vor' }, doi_data.resource));
    }
    if (doi_data.xml || doi_data.pdf || doi_data.zip) {
      const collectionChildren = [];
      if (doi_data.xml) {
        collectionChildren.push(
          e('item', [
            e('resource', { mime_type: 'text/xml', content_version: 'vor' }, doi_data.xml),
          ]),
        );
      }
      if (doi_data.pdf) {
        collectionChildren.push(
          e('item', [
            e('resource', { mime_type: 'application/pdf', content_version: 'vor' }, doi_data.pdf),
          ]),
        );
      }
      if (doi_data.zip) {
        collectionChildren.push(
          e('item', [
            e('resource', { mime_type: 'application/zip', content_version: 'vor' }, doi_data.zip),
          ]),
        );
      }
      doiChildren.push(e('collection', { property: 'text-mining' }, collectionChildren));
    }
    children.push(e('doi_data', doiChildren));
  }
  return e('journal_metadata', children);
}

/**
 * Create journal_issue xml
 *
 * Required fields: publication_date
 *
 * Optional fields: contributors, title, doi_data, volume, issue
 */
export function journalIssueXml({
  contributors,
  title,
  subtitle,
  volume,
  issue,
  doi_data,
  publication_dates,
}: JournalIssue) {
  if (!publication_dates?.length) throw new Error('Missing required frontmatter field: date');
  const children: Element[] = [];
  if (contributors) children.push(contributors);
  if (title || subtitle) {
    const titles: Element[] = [];
    if (title) titles.push(e('title', title));
    if (subtitle) titles.push(e('subtitle', subtitle));
    children.push(e('titles', titles));
  }
  children.push(...publication_dates.map(publicationDateXml).filter((d): d is Element => !!d));
  if (volume) {
    children.push(
      e('journal_volume', [
        e('volume', volume),
        // publisher_item
        // archive_locations
        // doi_data
      ]),
    );
  }
  if (issue) children.push(e('issue', issue));
  // special_numbering
  // archive_locations
  if (doi_data?.doi) {
    const doiChildren = [e('doi', doi_data.doi)];
    if (doi_data.resource) {
      doiChildren.push(e('resource', { content_version: 'vor' }, doi_data.resource));
    }
    if (doi_data.xml || doi_data.pdf || doi_data.zip) {
      const collectionChildren = [];
      if (doi_data.xml) {
        collectionChildren.push(
          e('item', [
            e('resource', { mime_type: 'text/xml', content_version: 'vor' }, doi_data.xml),
          ]),
        );
      }
      if (doi_data.pdf) {
        collectionChildren.push(
          e('item', [
            e('resource', { mime_type: 'application/pdf', content_version: 'vor' }, doi_data.pdf),
          ]),
        );
      }
      if (doi_data.zip) {
        collectionChildren.push(
          e('item', [
            e('resource', { mime_type: 'application/zip', content_version: 'vor' }, doi_data.zip),
          ]),
        );
      }
      doiChildren.push(e('collection', { property: 'text-mining' }, collectionChildren));
    }
    children.push(e('doi_data', doiChildren));
  }
  return e('journal_issue', children);
}

/**
 * Create journal_article xml
 *
 * Required fields: titles, doi_data, publication_date
 *
 * Optional fields: contributors, acceptance_date, pages,
 * publisher_item, fr:program, ai:program, ct:program, rel:program,
 * archive_locations, citation_list, jats:abstract, scn_policies, component_list
 */
export function journalArticleXml({
  contributors,
  title,
  subtitle,
  abstract,
  doi_data,
  citations,
  pages,
  funding,
  license,
  publication_dates,
}: JournalArticle) {
  if (!title) throw new Error('Missing required frontmatter field: title');
  if (!doi_data?.doi) throw new Error('Missing required frontmatter field: doi');
  if (!publication_dates?.length) throw new Error('Missing required frontmatter field: date');
  const children: Element[] = [];
  const titles = [e('title', title)];
  if (subtitle) titles.push(e('subtitle', subtitle));
  children.push(e('titles', titles));
  if (contributors) children.push(contributors);
  if (abstract) children.push(abstract);
  if (publication_dates) {
    children.push(...publication_dates.map(publicationDateXml).filter((d): d is Element => !!d));
  }
  // acceptance_date
  if (pages) {
    const pageChildren = [e('first_page', pages.first_page)];
    if (pages.last_page) pageChildren.push(e('last_page', pages.last_page));
    if (pages.other_pages) pageChildren.push(e('other_pages', pages.other_pages));
    children.push(e('pages', pageChildren));
  }
  // publisher_item
  if (funding?.length) {
    children.push(
      e(
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
      ),
    );
  }
  if (license) {
    children.push(
      e('ai:program', { name: 'AccessIndicators' }, [
        e('ai:free_to_read'),
        e('ai:license_ref', { applies_to: 'vor' }, license),
      ]),
    );
  }
  // rel:program, archive_locations, scn_policies
  const doiChildren = [e('doi', doi_data.doi)];
  if (doi_data.resource) {
    doiChildren.push(e('resource', { content_version: 'vor' }, doi_data.resource));
  }
  if (doi_data.xml || doi_data.pdf || doi_data.zip) {
    const collectionChildren = [];
    if (doi_data.xml) {
      collectionChildren.push(
        e('item', [e('resource', { mime_type: 'text/xml', content_version: 'vor' }, doi_data.xml)]),
      );
    }
    if (doi_data.pdf) {
      collectionChildren.push(
        e('item', [
          e('resource', { mime_type: 'application/pdf', content_version: 'vor' }, doi_data.pdf),
        ]),
      );
    }
    if (doi_data.zip) {
      collectionChildren.push(
        e('item', [
          e('resource', { mime_type: 'application/zip', content_version: 'vor' }, doi_data.zip),
        ]),
      );
    }
    doiChildren.push(e('collection', { property: 'text-mining' }, collectionChildren));
  }
  children.push(e('doi_data', doiChildren));
  if (citations) {
    children.push(
      e(
        'citation_list',
        Object.entries(citations).map(([key, value]) => {
          return e('citation', { key }, [e('doi', normalize(value))]);
        }),
      ),
    );
  }
  // component_list
  return e('journal_article', children);
}

/**
 * Create journal xml from metadata/issues/articles
 */
export function journalXml(
  metadata: JournalMetadata,
  issue?: JournalIssue,
  articles?: JournalArticle[],
) {
  const children: Element[] = [journalMetadataXml(metadata)];
  if (issue) children.push(journalIssueXml(issue));
  if (articles) children.push(...articles.map((article) => journalArticleXml(article)));
  return e('journal', children);
}

export function journalArticleFromMyst(
  session: ISession,
  myst: ProjectFrontmatter,
  citations?: Record<string, string>,
  abstract?: Element,
): JournalArticle {
  const { title, subtitle, license, doi, date, biblio } = myst;
  const contributors = contributorsXmlFromMyst(myst);
  const { first_page, last_page } = biblio ?? {};
  const pages = first_page
    ? {
        first_page: String(first_page),
        last_page: last_page ? String(last_page) : undefined,
      }
    : undefined;
  const articleOpts: JournalArticle = {
    contributors,
    title,
    subtitle,
    publication_dates: typeof date === 'string' ? [new Date(date)] : undefined,
    license: license?.content?.url,
    abstract,
    funding: fundrefFromMyst(session, myst),
    pages,
  };
  if (license && license.content?.CC) {
    // Only put in CC licenses at this time
    articleOpts.license = license.content.url;
  }
  const normalizedDoi = normalize(doi);
  if (normalizedDoi) {
    articleOpts.doi_data = {
      doi: normalizedDoi,
      resource: `https://doi.curvenote.com/${normalizedDoi}`,
    };
  }
  if (citations && Object.keys(citations).length) {
    articleOpts.citations = citations;
  }
  return articleOpts;
}
