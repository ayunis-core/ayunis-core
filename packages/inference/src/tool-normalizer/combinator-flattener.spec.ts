import { describe, expect, it } from 'vitest';

import type { MutableSchema } from './walk-schema';
import { CombinatorFlattener } from './combinator-flattener';

function flatten(schema: MutableSchema): MutableSchema {
  new CombinatorFlattener(schema).flatten();
  return schema;
}

describe('CombinatorFlattener', () => {
  it('merges oneOf branch properties into the root and drops their required', () => {
    expect(
      flatten({
        type: 'object',
        oneOf: [
          { properties: { a: { type: 'string' } }, required: ['a'] },
          { properties: { b: { type: 'number' } }, required: ['b'] },
        ],
      }),
    ).toEqual({
      type: 'object',
      properties: { a: { type: 'string' }, b: { type: 'number' } },
    });
  });

  it('keeps required from allOf branches', () => {
    expect(
      flatten({
        type: 'object',
        allOf: [
          { properties: { a: { type: 'string' } }, required: ['a'] },
          { properties: { b: { type: 'number' } }, required: ['b'] },
        ],
      }),
    ).toEqual({
      type: 'object',
      properties: { a: { type: 'string' }, b: { type: 'number' } },
      required: ['a', 'b'],
    });
  });

  it('collects properties from combinators nested inside a branch', () => {
    expect(
      flatten({
        type: 'object',
        oneOf: [{ allOf: [{ properties: { a: { type: 'string' } } }] }],
      }),
    ).toEqual({
      type: 'object',
      properties: { a: { type: 'string' } },
    });
  });

  it('hoists branch $defs under their original key', () => {
    expect(
      flatten({
        type: 'object',
        allOf: [
          {
            $defs: { Addr: { type: 'object' } },
            properties: { home: { $ref: '#/$defs/Addr' } },
            required: ['home'],
          },
        ],
      }),
    ).toEqual({
      type: 'object',
      properties: { home: { $ref: '#/$defs/Addr' } },
      required: ['home'],
      $defs: { Addr: { type: 'object' } },
    });
  });

  it('leaves schemas without top-level combinators untouched', () => {
    expect(flatten({ type: 'object' })).toEqual({ type: 'object' });
  });
});
