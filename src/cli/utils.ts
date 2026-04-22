import fs from 'node:fs';
import { u } from 'unist-builder';
import { selectAll } from 'unist-util-select';
import { liftChildren, type GenericNode, type GenericParent } from 'myst-common';
import type { Element, ElementContent } from 'xast';

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
 * Remove `jats:xref` wrappers from a JATS xast subtree, keeping only their children.
 */
export function unwrapJatsXrefElements(node: Element): Element {
  const children = node.children ?? [];
  const newChildren: ElementContent[] = [];
  for (const child of children) {
    if (child.type === 'element') {
      const processed = unwrapJatsXrefElements(child);
      if (processed.name === 'jats:xref') {
        for (const inner of processed.children) {
          newChildren.push(inner.type === 'element' ? unwrapJatsXrefElements(inner) : inner);
        }
      } else {
        newChildren.push(processed);
      }
    } else {
      newChildren.push(child);
    }
  }
  return { ...node, children: newChildren };
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

/**
 * Transform citations in abstract to plain text since bibliography is not currently available
 */
export function transformCiteToText(mdast: GenericParent) {
  const parentheticalCites = [
    ...selectAll(':not(citeGroup) > cite[kind=parenthetical]', mdast),
    ...selectAll('citeGroup[kind=parenthetical]', mdast),
  ] as GenericParent[];
  parentheticalCites.forEach((cite) => {
    if (!cite.children) return;
    cite.children = [{ type: 'text', value: '(' }, ...cite.children, { type: 'text', value: ')' }];
  });
  liftChildren(mdast, 'cite');
  liftChildren(mdast, 'citeGroup');
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

export function transformNewlineToSpace(mdast: GenericParent) {
  const text = selectAll('text', mdast) as GenericNode[];
  text.forEach((t) => {
    t.value = t.value?.replaceAll(/\s*\n\s*/g, ' ');
  });
}
