// Minimal structural mdast types — kept local so we don't depend on the
// 'mdast' package directly (it's only a transitive dep of react-markdown).
interface MdastNode {
  type: string;
  position?: { start: { offset?: number }; end: { offset?: number } };
  data?: { hProperties?: Record<string, unknown> };
  children?: MdastNode[];
}

const OPENING_FENCE = /^ {0,3}(`{3,}|~{3,})/;
const CONTAINER_PREFIX = /^[\s>]*/;

/**
 * Remark plugin for streamed markdown: marks a fenced code block whose
 * closing fence hasn't arrived yet with `data-fence-open`, so the code
 * renderer can skip syntax highlighting until the block is complete.
 */
export function remarkOpenCodeFences() {
  return (tree: MdastNode, file: { value: unknown }): void => {
    const source = String(file.value);
    visit(tree, (node) => {
      const start = node.position?.start.offset;
      const end = node.position?.end.offset;
      if (start === undefined || end === undefined) return;
      if (!isOpenFence(source.slice(start, end))) return;
      node.data = {
        ...node.data,
        hProperties: { ...node.data?.hProperties, 'data-fence-open': 'true' },
      };
    });
  };
}

function visit(node: MdastNode, onCode: (node: MdastNode) => void): void {
  if (node.type === 'code') {
    onCode(node);
    return;
  }
  node.children?.forEach((child) => visit(child, onCode));
}

function isOpenFence(raw: string): boolean {
  const lines = raw.split('\n');
  const opening = OPENING_FENCE.exec(lines[0]);
  if (!opening) return false;
  if (lines.length < 2) return true;
  const fence = opening[1];
  const closing = lines[lines.length - 1].replace(CONTAINER_PREFIX, '').trim();
  const isClosingFence =
    closing.length >= fence.length &&
    [...closing].every((char) => char === fence[0]);
  return !isClosingFence;
}
