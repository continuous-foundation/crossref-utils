import { VFile } from 'vfile';
import { u } from 'unist-builder';
import { selectAll } from 'unist-util-select';
import { liftChildren, type GenericNode, type GenericParent } from 'myst-common';
import { JatsSerializer } from 'myst-to-jats';
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

function jatsElementName(name: string): string {
  return name.includes(':') ? name : `jats:${name}`;
}

export function element2JatsUnist(element: JatsElement): Node {
  if (element.type === 'text' && element.text) {
    return u('text', element.text);
  }
  if (element.type === 'cdata' && element.cdata !== undefined) {
    return u('cdata', element.cdata);
  }
  if (element.name) {
    const props = { name: jatsElementName(element.name), attributes: element.attributes };
    if (element.elements) {
      return u(
        'element',
        props,
        element.elements.map((e) => element2JatsUnist(e)),
      );
    }
    return u('element', props);
  }
  throw new Error(`Invalid Jats element: ${JSON.stringify(element, null, 2)}`);
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

function transformXrefToLink(mdast: GenericParent) {
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

function transformCiteToText(mdast: GenericParent) {
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

function transformNewlineToSpace(mdast: GenericParent) {
  const text = selectAll('text', mdast) as GenericNode[];
  text.forEach((t) => {
    t.value = t.value?.replaceAll(/\s*\n\s*/g, ' ');
  });
}

/**
 * Convert processed MyST abstract mdast into a Crossref `jats:abstract` element.
 * Callers own myst-cli / part extraction; this helper only does light transforms + JATS serialize.
 */
export function abstractFromMdast(mdast: GenericParent): Element {
  transformXrefToLink(mdast);
  transformCiteToText(mdast);
  transformNewlineToSpace(mdast);
  const serializer = new JatsSerializer(new VFile(), mdast as any);
  const jats = serializer.render(true).elements();
  return unwrapJatsXrefElements(
    u(
      'element',
      { name: 'jats:abstract' },
      jats.map((el) => element2JatsUnist(el)),
    ) as Element,
  );
}
