import type { Element } from 'xast';
import { curvenoteDoiData, e } from './utils.js';
import type { DatabaseOptions, DatasetMetadata, Titles } from './types.js';
import type { PageFrontmatter } from 'myst-frontmatter';
import { normalize } from 'doi-utils';
import { contributorsXmlFromMystAuthors } from './contributors.js';
import { dateXml } from './dates.js';

function titleXml(title: Titles) {
  const titles = typeof title === 'string' ? [e('title', title)] : [e('title', title.title)];
  if (typeof title !== 'string') {
    if (title.subtitle) titles.push(e('subtitle', title.subtitle));
    if (title.original_language_title)
      titles.push(e('original_language_title', title.original_language_title));
    if (title.original_language_subtitle)
      titles.push(e('original_language_subtitle', title.original_language_subtitle));
  }
  return e('titles', titles);
}

/**
 * Create conference paper xml
 *
 * Required fields: titles, doi_data
 *
 * Optional fields: contributors, publication_date, acceptance_date, pages,
 * institution, publisher_item, fr:program, ai:program, ct:program, rel:program,
 * archive_locations, citation_list, jats:abstract, scn_policies, component_list
 */
export function datasetXml({
  type = 'other',
  contributors,
  date,
  title,
  description,
  doi_data,
  relations,
  citations,
}: DatasetMetadata) {
  if (!title) throw new Error('Missing required frontmatter field: title');
  if (!doi_data?.doi) throw new Error('Missing required frontmatter field: doi');
  const children: Element[] = [];
  if (contributors) children.push(contributors);
  children.push(titleXml(title));
  if (date) {
    const dateChildren: Element[] = [];
    if (date?.created) dateChildren.push(dateXml('creation_date', date.created) as Element);
    if (date?.published) dateChildren.push(dateXml('publication_date', date.published) as Element);
    if (date?.updated) dateChildren.push(dateXml('update_date', date.updated) as Element);
    children.push(e('database_date', dateChildren));
  }
  if (description) children.push(e('description', description));
  if (relations && relations.length > 0) {
    children.push(
      e(
        'program',
        { name: 'relations', xmlns: 'http://www.crossref.org/relations.xsd' },
        relations.map((relation) =>
          e('related_item', [
            e(
              relation.kind === 'inter' ? 'inter_work_relation' : 'intra_work_relation',
              { 'relationship-type': relation.relationship, 'identifier-type': relation.idType },
              relation.id,
            ),
          ]),
        ),
      ),
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
  return e('dataset', { dataset_type: type }, children);
}

export function datasetFromMyst(
  myst: PageFrontmatter,
  citations?: Record<string, string>,
  abstract?: string | Element[],
  doiResolution: (myst: PageFrontmatter) => { doi: string; resource: string } | undefined = ({
    doi,
  }) => curvenoteDoiData(doi as string),
) {
  const { title, subtitle, date, venue } = myst;
  if (!title) throw new Error('Must have a title');
  const contributors = contributorsXmlFromMystAuthors(myst);
  const datasetOpts: DatasetMetadata = {
    contributors,
    title: { title, subtitle },
    date: date ? { created: new Date(date) } : undefined,
    description: abstract,
  };
  datasetOpts.doi_data = doiResolution(myst);
  if (venue?.doi) {
    datasetOpts.relations = [
      { kind: 'inter', relationship: 'isPartOf', id: venue.doi, idType: 'doi' },
    ];
  }
  if (citations && Object.keys(citations).length) {
    datasetOpts.citations = citations;
  }
  return datasetXml(datasetOpts);
}

export function databaseXml({ contributors, title, description, datasets = [] }: DatabaseOptions) {
  const children: Element[] = [];
  if (!title) {
    throw new Error('Missing conference event name');
  }
  const databaseMetadataChildren: Element[] = [];
  if (contributors) databaseMetadataChildren.push(contributors);
  databaseMetadataChildren.push(titleXml(title));
  if (description) children.push(e('description', description));
  children.push(e('database_metadata', { language: 'en' }, databaseMetadataChildren));
  children.push(...datasets);
  return e('database', children);
}
