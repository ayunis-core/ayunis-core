import { describe, expect, it } from 'vitest';

import type { MutableSchema } from './walk-schema';
import { SchemaWalker } from './walk-schema';

const identityWalker = new SchemaWalker((node: MutableSchema) => node);
const markingWalker = new SchemaWalker((node: MutableSchema) => {
  node.visited = true;
  return node;
});

describe('SchemaWalker', () => {
  it('returns an equal schema for an identity rule', () => {
    const schema = {
      type: 'object',
      properties: { q: { type: 'string' } },
      required: ['q'],
    };
    expect(identityWalker.walk(schema)).toEqual(schema);
  });

  it('visits nested schemas in properties, $defs, items and combinators', () => {
    expect(
      markingWalker.walk({
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
      markingWalker.walk({
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
      identityWalker.walk({
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
      markingWalker.walk({
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

  it('does not mutate the input schema', () => {
    const schema = {
      type: 'array',
      items: [{ type: 'number' }],
      properties: { a: { type: 'string' } },
    };
    const copy = structuredClone(schema);
    markingWalker.walk(schema);
    expect(schema).toEqual(copy);
  });
});
