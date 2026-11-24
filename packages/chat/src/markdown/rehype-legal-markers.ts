import { splitLegalMarkers } from './legal-marker';

interface HastText {
  type: 'text';
  value: string;
}

interface HastElement {
  type: 'element';
  tagName: string;
  properties?: Record<string, unknown>;
  children: HastNode[];
}

interface HastParent {
  type: string;
  children?: HastNode[];
}

type HastNode = HastText | HastElement | HastParent;

export function rehypeLegalMarkers() {
  return (tree: HastParent): void => {
    visit(tree);
  };
}

function visit(node: HastNode): void {
  if (isExcludedElement(node)) return;
  const children = (node as HastParent).children;
  if (!children) return;

  for (let index = children.length - 1; index >= 0; index--) {
    const child = children[index];
    if (isText(child)) {
      const replacement = splitTextNode(child);
      if (replacement) children.splice(index, 1, ...replacement);
    } else {
      visit(child);
    }
  }
}

function splitTextNode(node: HastText): HastNode[] | null {
  const parts = splitLegalMarkers(node.value);
  if (parts.length === 1 && parts[0].kind === 'text') return null;

  return parts.map((part): HastNode => {
    if (part.kind === 'text') return { type: 'text', value: part.text };
    return {
      type: 'element',
      tagName: 'a',
      properties: {
        href: part.reference.href,
        'data-legal-reference': 'true',
      },
      children: [{ type: 'text', value: part.reference.label }],
    };
  });
}

function isText(node: HastNode): node is HastText {
  return node.type === 'text';
}

function isExcludedElement(node: HastNode): boolean {
  return (
    isElement(node) &&
    (node.tagName === 'code' || node.tagName === 'pre' || node.tagName === 'a')
  );
}

function isElement(node: HastNode): node is HastElement {
  return node.type === 'element';
}
