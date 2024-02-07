import { toXml } from 'xast-util-to-xml';
import { select } from 'unist-util-select';
import type { Element } from 'xast';
import { e } from './utils.js';
import type {
  ConferenceOptions,
  ConferencePaper,
  ContributorOptions,
  DoiBatchOptions,
} from './types.js';
import type { PageFrontmatter } from 'myst-frontmatter';

export * from './types.js';
export { generateDoi } from './utils.js';
export { default as version } from './version.js';

export class DoiBatch {
  tree: Element;

  constructor(opts: DoiBatchOptions, body: Element | Element[] = []) {
    const { id, timestamp = Date.now(), depositor, registrant = 'Crossref' } = opts;
    this.tree = e(
      'doi_batch',
      {
        'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
        version: '4.4.2',
        xmlns: 'http://www.crossref.org/schema/4.4.2',
        'xmlns:jats': 'http://www.ncbi.nlm.nih.gov/JATS1',
        'xmlns:ai': 'http://www.crossref.org/AccessIndicators.xsd',
        'xsi:schemaLocation':
          'http://www.crossref.org/schema/4.4.2 http://www.crossref.org/schemas/crossref4.4.2.xsd',
      },
      [
        e('head', {}, [
          e('doi_batch_id', id),
          e('timestamp', String(timestamp)),
          e('depositor', [
            e('depositor_name', depositor.name),
            e('email_address', depositor.email),
          ]),
          e('registrant', registrant),
        ]),
        e('body', Array.isArray(body) ? body : [body]),
      ],
    );
  }

  get body() {
    return select('body', this.tree);
  }

  toXml() {
    return toXml(this.tree);
  }
}

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

export function conferencePaperXml({
  contributors,
  title,
  abstract,
  doi_data,
  citations,
  pages,
  license,
  publication_dates,
}: ConferencePaper) {
  const children: Element[] = [];
  if (contributors) children.push(contributors);
  if (title) children.push(e('titles', [e('title', title)]));
  if (abstract) children.push(abstract);
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
  if (doi_data) {
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
  if (publication_dates) {
    children.push(
      ...publication_dates.map((date) => {
        return e('publication_date', { media_type: date.media_type }, [
          e('month', date.month),
          e('day', date.day),
          e('year', date.year),
        ]);
      }),
    );
  }
  if (citations) {
    children.push(
      e(
        'citation_list',
        Object.entries(citations).map(([key, value]) => {
          return e('citation', { key }, [e('doi', value)]);
        }),
      ),
    );
  }
  return e('conference_paper', children);
}

export function conferencePaperFromMyst(myst: PageFrontmatter) {
  const { title, biblio, license, doi } = myst;
  const contributors = contributorsXmlFromMyst(myst);
  const paperOpts: ConferencePaper = {
    contributors,
    title,
    license: license?.content?.url,
  };
  if (doi) {
    paperOpts.doi_data = { doi, resource: `https://doi.curvenote.com/${doi}` };
  }
  if (biblio?.first_page) {
    paperOpts.pages = { first_page: `${biblio.first_page}` };
    if (biblio.last_page) {
      paperOpts.pages.last_page = `${biblio.last_page}`;
    }
  }
  return conferencePaperXml(paperOpts);
}

export function conferenceXml({
  contributors,
  event,
  proceedings,
  doi_data,
  conference_papers = [],
}: ConferenceOptions) {
  return e('conference', [
    contributors,
    e('event_metadata', [
      e('conference_name', event.name),
      event.acronym ? e('conference_acronym', event.acronym) : undefined,
      event.number != null ? e('conference_number', String(event.number)) : undefined,
      e('conference_date', event.date),
    ]),
    e('proceedings_metadata', [
      e('proceedings_title', proceedings.title),
      e('publisher', [e('publisher_name', proceedings.publisher.name)]),
      e('publication_date', { media_type: 'online' }, [
        e('month', String(proceedings.publication_date.month).padStart(2, '0')),
        e('day', String(proceedings.publication_date.day).padStart(2, '0')),
        e('year', String(proceedings.publication_date.year)),
      ]),
      e('noisbn', { reason: 'archive_volume' }),
      e('doi_data', [e('doi', doi_data.doi), e('resource', doi_data.resource)]),
    ]),
    ...conference_papers,
  ]);
}
