import { describe, expect, it } from 'vitest';
import { rehypePiiMasks } from './rehype-pii-masks';

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
  rehypePiiMasks()(tree);
  return tree;
}

describe('rehypePiiMasks', () => {
  it('wraps tokens in paragraph text with marked spans', () => {
    const tree = root([
      element('p', [text('Hallo {{pii:PERSON_NAME_1}}, willkommen')]),
    ]);

    run(tree);

    const p = tree.children![0];
    expect(p.children).toEqual([
      { type: 'text', value: 'Hallo ' },
      {
        type: 'element',
        tagName: 'span',
        properties: { 'data-pii-token': '{{pii:PERSON_NAME_1}}' },
        children: [{ type: 'text', value: '{{pii:PERSON_NAME_1}}' }],
      },
      { type: 'text', value: ', willkommen' },
    ]);
  });

  it('processes tokens nested inside bold and list items', () => {
    const tree = root([
      element('ul', [
        element('li', [element('strong', [text('{{pii:EMAIL_ADDRESS_2}}')])]),
      ]),
    ]);

    run(tree);

    const strong = tree.children![0].children![0].children![0];
    expect(strong.children).toHaveLength(1);
    expect(strong.children![0]).toMatchObject({
      tagName: 'span',
      properties: { 'data-pii-token': '{{pii:EMAIL_ADDRESS_2}}' },
    });
  });

  it('leaves text inside code and pre untouched', () => {
    const codeText = 'const a = "{{pii:PERSON_NAME_1}}";';
    const tree = root([
      element('pre', [element('code', [text(codeText)])]),
      element('code', [text('{{pii:LOCATION_1}}')]),
    ]);

    run(tree);

    expect(tree.children![0].children![0].children).toEqual([
      { type: 'text', value: codeText },
    ]);
    expect(tree.children![1].children).toEqual([
      { type: 'text', value: '{{pii:LOCATION_1}}' },
    ]);
  });

  it('leaves token-free trees unchanged', () => {
    const tree = root([element('p', [text('Nur normaler Text')])]);

    run(tree);

    expect(tree.children![0].children).toEqual([
      { type: 'text', value: 'Nur normaler Text' },
    ]);
  });
});
