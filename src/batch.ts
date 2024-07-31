import { toXml } from 'xast-util-to-xml';
import { select } from 'unist-util-select';
import type { Element } from 'xast';
import { e } from './utils.js';
import type { DoiBatchOptions } from './types.js';

export class DoiBatch {
  tree: Element;

  constructor(opts: DoiBatchOptions, body: Element | Element[] = []) {
    const { id, timestamp = Date.now(), depositor, registrant = 'Crossref' } = opts;
    this.tree = e(
      'doi_batch',
      {
        'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
        version: '5.3.1',
        xmlns: 'http://www.crossref.org/schema/5.3.1',
        'xmlns:jats': 'http://www.ncbi.nlm.nih.gov/JATS1',
        'xmlns:mml': 'http://www.w3.org/1998/Math/MathML',
        'xmlns:xlink': 'http://www.w3.org/1999/xlink',
        'xmlns:fr': 'http://www.crossref.org/fundref.xsd',
        'xmlns:ai': 'http://www.crossref.org/AccessIndicators.xsd',
        'xsi:schemaLocation':
          'http://www.crossref.org/schema/5.3.1 http://www.crossref.org/schemas/crossref5.3.1.xsd',
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
    return select('body', this.tree as any) as Element;
  }

  toXml() {
    return toXml(this.tree);
  }
}
