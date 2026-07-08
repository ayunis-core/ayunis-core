import { describe, expect, it } from 'vitest';

import type { MutableSchema } from './normalizer';
import { SchemaNormalizer } from './normalizer';

class IdentityNormalizer extends SchemaNormalizer {
  protected visitNode(node: MutableSchema): MutableSchema {
    return node;
  }
}

class MarkingNormalizer extends SchemaNormalizer {
  protected visitNode(node: MutableSchema): MutableSchema {
    node.visited = true;
    return node;
  }
}

class RootTypingNormalizer extends IdentityNormalizer {
  protected visitRoot(root: MutableSchema): MutableSchema {
    root.type ??= 'object';
    return root;
  }
}

describe('SchemaNormalizer', () => {
  const identity = new IdentityNormalizer();
  const marking = new MarkingNormalizer();

  it('returns an equal schema for identity rules', () => {
    const schema = {
      type: 'object',
      properties: { q: { type: 'string' } },
      required: ['q'],
    };
    expect(identity.normalize(schema)).toEqual(schema);
  });

  it('visits nested schemas in properties, $defs, items and combinators', () => {
    expect(
      marking.normalize({
        properties: { a: { type: 'string' } },
        $defs: { b: { type: 'number' } },
        items: { type: 'integer' },
        anyOf: [{ type: 'boolean' }],
      }),
    ).toEqual({
      visited: true,
      properties: { a: { type: 'string', visited: true } },
      $defs: { b: { type: 'number', visited: true } },
      items: { type: 'integer', visited: true },
      anyOf: [{ type: 'boolean', visited: true }],
    });
  });

  it('does not descend into data-value keys like default and enum', () => {
    expect(
      marking.normalize({
        properties: {
          a: { type: 'object', default: { nested: true }, enum: ['x'] },
        },
      }),
    ).toEqual({
      visited: true,
      properties: {
        a: {
          type: 'object',
          visited: true,
          default: { nested: true },
          enum: ['x'],
        },
      },
    });
  });

  it('collapses tuple-form items into a single anyOf schema', () => {
    expect(
      identity.normalize({
        type: 'array',
        items: [{ type: 'number' }, { type: 'string' }],
        additionalItems: false,
      }),
    ).toEqual({
      type: 'array',
      items: { anyOf: [{ type: 'number' }, { type: 'string' }] },
    });
  });

  it('walks tuple entries recursively', () => {
    expect(
      marking.normalize({
        type: 'array',
        items: [{ type: 'array', items: [{ type: 'number' }] }],
      }),
    ).toEqual({
      type: 'array',
      visited: true,
      items: {
        anyOf: [
          {
            type: 'array',
            visited: true,
            items: { anyOf: [{ type: 'number', visited: true }] },
          },
        ],
      },
    });
  });

  it('applies visitRoot once, at the top level only', () => {
    expect(
      new RootTypingNormalizer().normalize({
        properties: { a: { properties: {} } },
      }),
    ).toEqual({
      type: 'object',
      properties: { a: { properties: {} } },
    });
  });

  it('does not mutate the input schema', () => {
    const schema = {
      type: 'array',
      items: [{ type: 'number' }],
      properties: { a: { type: 'string' } },
    };
    const copy = structuredClone(schema);
    marking.normalize(schema);
    expect(schema).toEqual(copy);
  });
});
