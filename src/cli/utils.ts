import fs from 'node:fs';
import { u } from 'unist-builder';
import { selectAll } from 'unist-util-select';
import type { GenericNode, GenericParent } from 'myst-common';

type JatsAttributes = Record<string, string | undefined>;

type JatsElement = {
  type: 'element' | 'text' | 'cdata';
  name?: string;
  text?: string;
  cdata?: string;
  attributes?: JatsAttributes;
  elements?: JatsElement[];
};

type Node = { type: string; value?: string; children?: Node[] };

export function element2JatsUnist(element: JatsElement): Node {
  if (element.type === 'text' && element.text) {
    return u('text', element.text);
  }
  if (element.name && element.elements) {
    return u(
      'element',
      { name: `jats:${element.name}`, attributes: element.attributes },
      element.elements.map((e) => element2JatsUnist(e)),
    );
  }
  throw new Error(`Invalid Jats element: ${element}`);
}

/**
 * Transform to handle xrefs that resolve to external sites
 *
 * This should probably be up-streamed to myst-to-jats
 */
export function transformXrefToLink(mdast: GenericParent) {
  const xrefs = selectAll('crossReference', mdast);
  xrefs.forEach((node: GenericNode) => {
    if (node.remoteBaseUrl) {
      node.type = 'link';
      node.url = `${node.remoteBaseUrl}${node.url ? node.url : ''}${node.html_id ? `#${node.html_id}` : ''}`;
      delete node.identifier;
      delete node.label;
    }
  });
}

export function addDoiToConfig(configFile: string, doi: string) {
  const file = fs.readFileSync(configFile).toString();
  const lines = file.split('\n');
  const projectIndex = lines.findIndex((line) => line.trim() === 'project:');
  const newLines = [
    ...lines.slice(0, projectIndex + 1),
    `  doi: ${doi}`,
    ...lines.slice(projectIndex + 1),
  ];
  fs.writeFileSync(configFile, newLines.join('\n'));
}
