import type { Element } from 'xast';
import { e } from './utils.js';
import type { Preprint } from './types.js';
import type { ProjectFrontmatter } from 'myst-frontmatter';
import { normalize } from 'doi-utils';
import { contributorsXmlFromMyst } from './contributors.js';
import { dateXml } from './dates.js';

/**
 * Create posted content xml
 *
 * Required fields: titles, posted_date, doi_data
 *
 * Optional fields: group_title, contributors, acceptance_date, institution,
 * fr:program, ai:program, rel:program, citation_list, jats:abstract, scn_policy
 */
export function preprintXml({
  contributors,
  title,
  subtitle,
  abstract,
  doi_data,
  citations,
  license,
  date,
}: Preprint) {
  if (!title) throw new Error('Missing required field: title');
  const posted_date = dateXml('posted_date', date);
  if (!posted_date) throw new Error('Missing required field: date');
  if (!doi_data?.doi) throw new Error('Missing required field: doi');
  const children: Element[] = [];
  if (contributors) children.push(contributors);
  const titles = [e('title', title)];
  if (subtitle) titles.push(e('subtitle', subtitle));
  children.push(e('titles', titles));
  children.push(posted_date);
  if (abstract) children.push(abstract);
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
          return e('citation', { key }, [e('doi', value)]);
        }),
      ),
    );
  }
  return e('posted_content', children);
}

export function preprintFromMyst(
  myst: ProjectFrontmatter,
  citations?: Record<string, string>,
  abstract?: Element,
) {
  const { title, subtitle, license, doi, date } = myst;
  const contributors = contributorsXmlFromMyst(myst);
  const paperOpts: Preprint = {
    contributors,
    title,
    subtitle,
    date: typeof date === 'string' ? new Date(date) : undefined,
    license: license?.content?.url,
    abstract,
  };
  if (license && license.content?.CC) {
    // Only put in CC licenses at this time
    paperOpts.license = license.content.url;
  }
  const normalizedDoi = normalize(doi);
  if (normalizedDoi) {
    paperOpts.doi_data = {
      doi: normalizedDoi,
      resource: `https://doi.curvenote.com/${normalizedDoi}`,
    };
  }
  if (citations && Object.keys(citations).length) {
    paperOpts.citations = citations;
  }
  return preprintXml(paperOpts);
}
