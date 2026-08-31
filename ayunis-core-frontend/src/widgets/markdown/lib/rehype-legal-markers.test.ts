import { describe, expect, it } from 'vitest';
import { rehypeLegalMarkers } from './rehype-legal-markers';

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

function element(tagName: string, children: TestNode[]): TestNode {
  return { type: 'element', tagName, properties: {}, children };
}

function root(children: TestNode[]): TestNode {
  return { type: 'root', children };
}

function run(tree: TestNode): TestNode {
  rehypeLegalMarkers()(tree);
  return tree;
}

describe('rehypeLegalMarkers', () => {
  it('turns a valid marker nested in markdown formatting into a marked link', () => {
    const tree = root([
      element('strong', [text('Siehe {{legal:DE/BGB/sec_433/par_2}}.')]),
    ]);

    run(tree);

    expect(tree.children![0].children).toEqual([
      { type: 'text', value: 'Siehe ' },
      {
        type: 'element',
        tagName: 'a',
        properties: {
          href: 'https://bundesrecht.online/BGB/433#Abs2',
          'data-legal-reference': 'true',
        },
        children: [{ type: 'text', value: '§ 433 Abs. 2 BGB' }],
      },
      { type: 'text', value: '.' },
    ]);
  });

  it('leaves markers inside code and pre untouched', () => {
    const marker = '{{legal:DE/BGB/sec_433}}';
    const tree = root([
      element('code', [text(marker)]),
      element('pre', [element('code', [text(marker)])]),
    ]);

    run(tree);

    expect(tree.children![0].children).toEqual([text(marker)]);
    expect(tree.children![1].children![0].children).toEqual([text(marker)]);
  });

  it('leaves markers inside existing links untouched', () => {
    const marker = '{{legal:DE/BGB/sec_433}}';
    const tree = root([element('a', [text(marker)])]);

    run(tree);

    expect(tree.children![0].children).toEqual([text(marker)]);
  });

  it('leaves invalid markers as literal text', () => {
    const marker = '{{legal:DE-XX/POG/art_1}}';
    const tree = root([element('p', [text(marker)])]);

    run(tree);

    expect(tree.children![0].children).toEqual([text(marker)]);
  });
});
