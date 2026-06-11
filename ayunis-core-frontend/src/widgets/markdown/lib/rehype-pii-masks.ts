import { splitPiiTokens } from './pii-token';

// Minimal structural hast types — kept local so we don't depend on the
// 'hast' package directly (it's only a transitive dep of react-markdown).
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

/**
 * Rehype plugin that wraps `{{pii:...}}` tokens in text nodes with
 * `<span data-pii-token="...">` elements so the Markdown component can swap
 * them for resolved mask values. Subtrees of `code`/`pre` are skipped — their
 * custom renderers stringify children, and a span child would render empty.
 *
 * Dictionary-independent by design: mask updates don't require a re-parse.
 */
export function rehypePiiMasks() {
  return (tree: HastParent): void => {
    visit(tree);
  };
}

function visit(node: HastNode): void {
  if (isElement(node) && (node.tagName === 'code' || node.tagName === 'pre')) {
    return;
  }
  const children = (node as HastParent).children;
  if (!children) return;

  for (let i = children.length - 1; i >= 0; i--) {
    const child = children[i];
    if (isText(child)) {
      const replacement = splitTextNode(child);
      if (replacement) {
        children.splice(i, 1, ...replacement);
      }
    } else {
      visit(child);
    }
  }
}

function splitTextNode(node: HastText): HastNode[] | null {
  const parts = splitPiiTokens(node.value);
  if (parts.length === 1 && parts[0].kind === 'text') {
    return null;
  }
  return parts.map((part): HastNode => {
    if (part.kind === 'text') {
      return { type: 'text', value: part.text };
    }
    return {
      type: 'element',
      tagName: 'span',
      properties: { 'data-pii-token': part.token },
      children: [{ type: 'text', value: part.token }],
    };
  });
}

function isText(node: HastNode): node is HastText {
  return node.type === 'text';
}

function isElement(node: HastNode): node is HastElement {
  return node.type === 'element';
}
