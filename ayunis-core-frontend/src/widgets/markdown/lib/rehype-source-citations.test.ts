import { describe, expect, it } from 'vitest';
import { rehypeSourceCitations } from './rehype-source-citations';

const CHUNK_ID = '123e4567-e89b-12d3-a456-426614174000';
const MARKER = `{{source:${CHUNK_ID}|Quelle 1}}`;

interface TestNode {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: TestNode[];
}

function text(value: string): TestNode {
  return { type: 'text', value };
}

function element(
  tagName: string,
  children: TestNode[],
  properties: Record<string, unknown> = {},
): TestNode {
  return { type: 'element', tagName, properties, children };
}

function root(children: TestNode[]): TestNode {
  return { type: 'root', children };
}

function run(tree: TestNode): TestNode {
  rehypeSourceCitations()(tree);
  return tree;
}

describe('rehypeSourceCitations', () => {
  it('turns a valid marker into a constrained citation element', () => {
    const tree = root([element('p', [text(`See ${MARKER}.`)])]);

    run(tree);

    expect(tree.children![0].children).toEqual([
      { type: 'text', value: 'See ' },
      {
        type: 'element',
        tagName: 'span',
        properties: {
          'data-source-citation': 'true',
          'data-source-chunk-id': CHUNK_ID,
          'data-source-label': 'Quelle 1',
        },
        children: [{ type: 'text', value: 'Quelle 1' }],
      },
      { type: 'text', value: '.' },
    ]);
  });

  it.each(['code', 'pre', 'a'])('leaves markers inside %s untouched', (tag) => {
    const tree = root([element(tag, [text(MARKER)])]);

    run(tree);

    expect(tree.children![0].children).toEqual([text(MARKER)]);
  });

  it('does not revisit generated citation elements', () => {
    const tree = root([
      element('span', [text(MARKER)], { 'data-source-citation': 'true' }),
    ]);

    run(tree);

    expect(tree.children![0].children).toEqual([text(MARKER)]);
  });
});
