import {
  findSourceCitationMarkers,
  splitSourceCitationMarkers,
} from './source-citation';
import type { SourceCitation } from './source-citation';

interface HastPoint {
  offset?: number;
}

interface HastPosition {
  start: HastPoint;
  end: HastPoint;
}

interface HastText {
  type: 'text';
  value: string;
  position?: HastPosition;
}

interface HastElement {
  type: 'element';
  tagName: string;
  properties?: Record<string, unknown>;
  children: HastNode[];
  position?: HastPosition;
}

interface HastParent {
  type: string;
  children?: HastNode[];
  position?: HastPosition;
}

type HastNode = HastText | HastElement | HastParent;
type CitationMatch = ReturnType<typeof findSourceCitationMarkers>[number];

interface VFileLike {
  value?: unknown;
}

export function rehypeSourceCitations() {
  return (tree: HastParent, file?: VFileLike): void => {
    const source = typeof file?.value === 'string' ? file.value : null;
    if (source === null) {
      visitTextNodes(tree);
      return;
    }
    visitPositionedNodes(tree, findSourceCitationMarkers(source));
  };
}

function visitPositionedNodes(
  node: HastNode,
  matches: readonly CitationMatch[],
): void {
  if (isExcludedElement(node)) return;
  const children = (node as HastParent).children;
  if (!children) return;

  children.forEach((child) => visitPositionedNodes(child, matches));
  if (isElement(node)) replaceCrossNodeMarkers(node, matches);
}

function replaceCrossNodeMarkers(
  parent: HastElement,
  matches: readonly CitationMatch[],
): void {
  const start = parent.position?.start.offset;
  const end = parent.position?.end.offset;
  if (start === undefined || end === undefined) return;

  const contained = matches
    .filter((match) => match.start >= start && match.end <= end)
    .sort((left, right) => right.start - left.start);
  contained.forEach((match) => replaceMarker(parent, match));
}

function replaceMarker(parent: HastElement, match: CitationMatch): void {
  const startIndex = findBoundaryTextIndex(parent.children, match.start, false);
  const endIndex = findBoundaryTextIndex(parent.children, match.end, true);
  if (startIndex < 0 || endIndex < startIndex) return;

  const startNode = parent.children[startIndex] as HastText;
  const endNode = parent.children[endIndex] as HastText;
  const opening = `{{source:${match.citation.chunkId}|`;
  const openingIndex = startNode.value.lastIndexOf(opening);
  const closingIndex = endNode.value.indexOf(
    '}}',
    startNode === endNode ? openingIndex + opening.length : 0,
  );
  if (openingIndex < 0 || closingIndex < 0) return;

  const prefix = startNode.value.slice(0, openingIndex);
  const suffix = endNode.value.slice(closingIndex + 2);
  parent.children.splice(
    startIndex,
    endIndex - startIndex + 1,
    ...replacementNodes(startNode, endNode, prefix, suffix, match.citation),
  );
}

function findBoundaryTextIndex(
  children: readonly HastNode[],
  offset: number,
  isEnd: boolean,
): number {
  return children.findIndex((child) => {
    if (!isText(child)) return false;
    const start = child.position?.start.offset;
    const end = child.position?.end.offset;
    if (start === undefined || end === undefined) return false;
    return isEnd
      ? offset > start && offset <= end
      : offset >= start && offset < end;
  });
}

function replacementNodes(
  startNode: HastText,
  endNode: HastText,
  prefix: string,
  suffix: string,
  citation: SourceCitation,
): HastNode[] {
  const nodes: HastNode[] = [];
  if (prefix) nodes.push({ ...startNode, value: prefix });
  nodes.push(createCitationElement(citation));
  if (suffix) nodes.push({ ...endNode, value: suffix });
  return nodes;
}

function visitTextNodes(node: HastNode): void {
  if (isExcludedElement(node)) return;
  const children = (node as HastParent).children;
  if (!children) return;

  for (let index = children.length - 1; index >= 0; index--) {
    const child = children[index];
    if (isText(child)) {
      const replacement = splitTextNode(child);
      if (replacement) children.splice(index, 1, ...replacement);
    } else {
      visitTextNodes(child);
    }
  }
}

function splitTextNode(node: HastText): HastNode[] | null {
  const parts = splitSourceCitationMarkers(node.value);
  if (parts.length === 1 && parts[0].kind === 'text') return null;

  return parts.map((part): HastNode =>
    part.kind === 'text'
      ? { type: 'text', value: part.text }
      : createCitationElement(part.citation),
  );
}

function createCitationElement(citation: SourceCitation): HastElement {
  return {
    type: 'element',
    tagName: 'span',
    properties: {
      'data-source-citation': 'true',
      'data-source-chunk-id': citation.chunkId,
      'data-source-label': citation.label,
    },
    children: [{ type: 'text', value: citation.label }],
  };
}

function isText(node: HastNode): node is HastText {
  return node.type === 'text';
}

function isExcludedElement(node: HastNode): boolean {
  if (!isElement(node)) return false;
  return (
    node.tagName === 'code' ||
    node.tagName === 'pre' ||
    node.tagName === 'a' ||
    node.properties?.['data-source-citation'] === 'true'
  );
}

function isElement(node: HastNode): node is HastElement {
  return node.type === 'element';
}
