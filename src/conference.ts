import type { Element } from 'xast';
import { e } from './utils.js';
import type { ConferenceOptions, ConferencePaper } from './types.js';
import type { PageFrontmatter } from 'myst-frontmatter';
import { normalize } from 'doi-utils';
import { contributorsXmlFromMystAuthors } from './contributors.js';
import { publicationDateXml } from './dates.js';

/**
 * Create conference paper xml
 *
 * Required fields: titles, doi_data
 *
 * Optional fields: contributors, publication_date, acceptance_date, pages,
 * institution, publisher_item, fr:program, ai:program, ct:program, rel:program,
 * archive_locations, citation_list, jats:abstract, scn_policies, component_list
 */
export function conferencePaperXml({
  contributors,
  title,
  subtitle,
  abstract,
  doi_data,
  citations,
  pages,
  license,
  publication_dates,
}: ConferencePaper) {
  if (!title) throw new Error('Missing required frontmatter field: title');
  if (!doi_data?.doi) throw new Error('Missing required frontmatter field: doi');
  const children: Element[] = [];
  if (contributors) children.push(contributors);
  const titles = [e('title', title)];
  if (subtitle) titles.push(e('subtitle', subtitle));
  children.push(e('titles', titles));
  if (abstract) children.push(abstract);
  if (publication_dates) {
    children.push(...publication_dates.map(publicationDateXml).filter((d): d is Element => !!d));
  }
  if (pages) {
    const pageChildren = [e('first_page', pages.first_page)];
    if (pages.last_page) pageChildren.push(e('last_page', pages.last_page));
    if (pages.other_pages) pageChildren.push(e('other_pages', pages.other_pages));
    children.push(e('pages', pageChildren));
  }
  if (license) {
    children.push(
      e('ai:program', { name: 'AccessIndicators' }, [
        e('ai:free_to_read'),
        e('ai:license_ref', { applies_to: 'vor' }, license),
      ]),
    );
  }
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
  return e('conference_paper', children);
}

export function conferencePaperFromMyst(
  myst: PageFrontmatter,
  citations?: Record<string, string>,
  abstract?: Element,
) {
  const { title, subtitle, biblio, license, doi, date } = myst;
  const contributors = contributorsXmlFromMystAuthors(myst);
  const paperOpts: ConferencePaper = {
    contributors,
    title,
    subtitle,
    publication_dates: typeof date === 'string' ? [new Date(date)] : undefined,
    license: license?.content?.url,
    abstract,
  };
  if (license && license.content?.CC) {
    // Only put in CC licenses at this time
    paperOpts.license = license.content.url;
  }
  if (doi) {
    paperOpts.doi_data = { doi, resource: `https://doi.curvenote.com/${doi}` };
  }
  if (biblio?.first_page) {
    paperOpts.pages = { first_page: `${biblio.first_page}` };
    if (biblio.last_page) {
      paperOpts.pages.last_page = `${biblio.last_page}`;
    }
  }
  if (citations && Object.keys(citations).length) {
    paperOpts.citations = citations;
  }
  return conferencePaperXml(paperOpts);
}

export function conferenceXml({
  contributors,
  event,
  series,
  proceedings,
  conference_papers = [],
}: ConferenceOptions) {
  const conferenceChildren: Element[] = [];
  // SciPy has no contributors here
  if (!event?.name) {
    throw new Error('Missing conference event name');
  }
  if (!proceedings?.title) {
    throw new Error('Missing proceedings title');
  }
  if (!proceedings?.publisher?.name) {
    throw new Error('Missing proceedings publisher');
  }
  const dateElement = publicationDateXml(proceedings.publication_date); // 2022
  if (!dateElement) {
    throw new Error('Missing proceedings publication date');
  }
  if (series && !series.title) {
    throw new Error('Missing proceedings series title');
  }
  if (series && !series.issn) {
    throw new Error('Missing proceedings series ISSN');
  }
  if (contributors) conferenceChildren.push(contributors);
  const eventChildren = [e('conference_name', event.name)];
  if (event.acronym) {
    eventChildren.push(e('conference_acronym', event.acronym));
  }
  if (event.number != null) {
    eventChildren.push(e('conference_number', String(event.number)));
  }
  if (event.location) {
    eventChildren.push(e('conference_location', event.location));
  }
  if (event.date) {
    eventChildren.push(e('conference_date', event.date));
  }
  conferenceChildren.push(e('event_metadata', eventChildren));
  const proceedingsChildren = [e('proceedings_title', proceedings.title)];
  if (proceedings.subject) {
    proceedingsChildren.push(e('proceedings_subject', proceedings.subject));
  }
  proceedingsChildren.push(
    e('publisher', [e('publisher_name', proceedings.publisher.name)]),
    dateElement,
    e('noisbn', { reason: 'simple_series' }),
  );
  if (proceedings.doi_data) {
    proceedingsChildren.push(
      e('doi_data', [
        e('doi', proceedings.doi_data.doi),
        e('resource', proceedings.doi_data.resource),
      ]),
    );
  }
  if (series) {
    const seriesTitles = [e('title', series.title)];
    if (series.original_language_title) {
      seriesTitles.push(e('original_language_title', series.original_language_title));
    }
    const seriesChildren = [e('titles', seriesTitles), e('issn', series.issn)];
    if (series.doi_data) {
      seriesChildren.push(
        e('doi_data', [e('doi', series.doi_data.doi), e('resource', series.doi_data.resource)]),
      );
    }
    conferenceChildren.push(
      e('proceedings_series_metadata', [
        e('series_metadata', seriesChildren),
        ...proceedingsChildren,
      ]),
    );
  } else {
    conferenceChildren.push(e('proceedings_metadata', proceedingsChildren));
  }
  conferenceChildren.push(...conference_papers);
  return e('conference', conferenceChildren);
}
