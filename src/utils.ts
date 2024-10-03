import { customAlphabet } from 'nanoid';
import { u } from 'unist-builder';
import type { Element } from 'xast';

export function t(value: string) {
  return u('text', value);
}
export function e(name: string, children?: string | any[]): Element;
export function e(
  name: string,
  attributes: Record<string, any>,
  children?: string | any[],
): Element;
export function e(name: string, attributes = {}, children?: string | any[]): Element {
  if ((children === undefined && typeof attributes === 'string') || Array.isArray(attributes)) {
    children = attributes;
    attributes = {};
  }
  if (typeof children === 'string') {
    return u('element', { name, attributes }, [t(children)]);
  }
  return u('element', { name, attributes }, children?.filter((c) => !!c) as Element[]);
}

// For letters and numbers that conflict, the letters were eliminated:
// 0 not O/Q, 1 not I/L, 2 not Z, 5 not S, 8 not B
const alpha = 'ACDEFGHJKMNPRTUVWXY';
const numbers = '0123456789';
const nanoidAZ = customAlphabet(alpha, 4);
const nanoidAZ9 = customAlphabet(numbers, 4);

export function generateDoi(prefix: string) {
  return `${prefix}/${nanoidAZ()}${nanoidAZ9()}`;
}

export function curvenoteDoiData(doi: string) {
  return {
    doi,
    resource: `https://doi.curvenote.com/${doi}`,
  };
}
