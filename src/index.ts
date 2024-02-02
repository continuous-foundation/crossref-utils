import { toXml } from 'xast-util-to-xml';
import { select } from 'unist-util-select';
import type { Element } from 'xast';
import { e } from './utils.js';
import type { ContributorOptions, DoiBatchOptions } from './types.js';
import type { ProjectFrontmatter } from 'myst-frontmatter';

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
  myst: ProjectFrontmatter,
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

export function conferenceXml({
  contributors,
  event,
  proceedings,
  doi,
  conference_papers = [],
}: {
  event: {
    name: string;
    acronym?: string;
    number?: number;
    date: string;
  };
  contributors?: Element;
  proceedings: {
    title: string;
    publisher: { name: string };
    publication_date: { year: number; month: number; day: number };
  };
  doi: { doi: string; resource: string };
  conference_papers?: Element[];
}) {
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
      e('doi_data', [e('doi', doi.doi), e('resource', doi.resource)]),
    ]),
    ...conference_papers,
  ]);
}
