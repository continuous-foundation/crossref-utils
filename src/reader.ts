import { fromXml } from 'xast-util-from-xml';
import { selectAll, select } from 'unist-util-select';
import { visit } from 'unist-util-visit';

export type Root = ReturnType<typeof fromXml>;

type GenericNode = {
  type: string;
  name: string;
  children: GenericNode[];
  value: string;
};

type Depositor = {
  name: string;
  email: string;
};

function toText(node: GenericNode) {
  const texts: string[] = [];
  visit(node, 'text', (n: GenericNode) => {
    texts.push(n.value);
  });
  return texts.join(' ');
}

export class DoiBatchReader {
  tree: Root | Element;
  constructor(xml: string) {
    this.tree = fromXml(xml);
  }

  get root() {
    return this.tree;
  }

  getHead() {
    const head = select('[name=head]', this.tree as any) as GenericNode;
    const idNode = select('[name=doi_batch_id]', head) as GenericNode;
    const timestampNode = select('[name=timestamp]', head) as GenericNode;
    const nameNode = select('[name=depositor_name]', head) as GenericNode;
    const emailNode = select('[name=email_address]', head) as GenericNode;

    return {
      id: toText(idNode),
      timestamp: new Date(1000 * Number(toText(timestampNode))),
      depositor: {
        name: toText(nameNode),
        email: toText(emailNode),
      } as Depositor,
      registrant: toText(select('[name=registrant]', head) as GenericNode),
    };
  }

  getConferencePaper(entry: GenericNode) {
    const doiNode = select('[name=doi]', entry) as GenericNode;
    const doi = doiNode ? toText(doiNode) : null;
    const year = toText(select('[name=year]', entry) as GenericNode);
    const title = toText(select('[name=title]', entry) as GenericNode);
    const authorNodes = selectAll('[name=contributors] [name=person_name]', entry) as GenericNode[];
    const authors = authorNodes.map((item) => {
      return {
        name: `${toText(select('[name=given_name]', item) as GenericNode)} ${toText(select('[name=surname]', item) as GenericNode)}`,
      };
    });

    const pages = select('[name=pages]', entry)
      ? [
          toText(select('[name=first_page]', entry) as GenericNode),
          toText(select('[name=last_page]', entry) as GenericNode),
        ]
      : null;

    return {
      type: entry.name,
      title,
      authors,
      doi,
      year,
      pages,
    };
  }

  getEventMetadata(entry: GenericNode) {
    return {
      type: entry.name,
      name: toText(select('[name=conference_name]', entry) as GenericNode),
      acronym: toText(select('[name=conference_acronym]', entry) as GenericNode),
      location: toText(select('[name=conference_location]', entry) as GenericNode),
      date: toText(select('[name=conference_date]', entry) as GenericNode),
      number: toText(select('[name=conference_number]', entry) as GenericNode),
    };
  }

  getProceedingsSeriesMetadata(entry: GenericNode) {
    return {
      type: entry.name,
      title: toText(select('[name=title]', entry) as GenericNode),
      originalLanguageTitle: toText(select('[name=original_language_title]', entry) as GenericNode),
      issn: toText(select('[name=issn]', entry) as GenericNode),
      publisher: toText(select('[name=publisher_name]', entry) as GenericNode),
      doi: toText(select('[name=doi]', entry) as GenericNode),
      resource: toText(select('[name=resource]', entry) as GenericNode),
    };
  }

  getEntries() {
    const body = select('[name=body]', this.tree as any) as GenericNode;
    const conference = select(`[name=conference]`, body) as GenericNode;
    return conference.children.map((e) => {
      switch (e.name) {
        case 'conference_paper':
          return this.getConferencePaper(e as GenericNode);
        case 'event_metadata':
          return this.getEventMetadata(e as GenericNode);
        case 'proceedings_series_metadata':
          return this.getProceedingsSeriesMetadata(e as GenericNode);
        default:
          return {
            type: e.name,
            json: JSON.stringify(e),
          };
      }
    });
  }
}
