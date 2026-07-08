import { describe, expect, it } from 'vitest';

import { normalizeSchemaForAnthropic } from './normalize-schema';

describe('normalizeSchemaForAnthropic', () => {
  it('leaves a valid object schema untouched', () => {
    const schema = {
      type: 'object',
      properties: { q: { type: 'string' } },
      required: ['q'],
    };
    expect(normalizeSchemaForAnthropic(schema)).toEqual(schema);
  });

  it('adds top-level type object when missing but properties are present', () => {
    expect(
      normalizeSchemaForAnthropic({ properties: { q: { type: 'string' } } }),
    ).toEqual({ type: 'object', properties: { q: { type: 'string' } } });
  });

  it('turns an empty schema into an empty object schema', () => {
    expect(normalizeSchemaForAnthropic({})).toEqual({
      type: 'object',
      properties: {},
    });
  });

  it('converts draft-04 boolean exclusiveMinimum to its 2020-12 numeric form', () => {
    expect(
      normalizeSchemaForAnthropic({
        type: 'object',
        properties: {
          n: { type: 'number', minimum: 0, exclusiveMinimum: true },
        },
      }),
    ).toEqual({
      type: 'object',
      properties: { n: { type: 'number', exclusiveMinimum: 0 } },
    });
  });

  it('converts draft-04 boolean exclusiveMaximum to its 2020-12 numeric form', () => {
    expect(
      normalizeSchemaForAnthropic({
        type: 'object',
        properties: {
          n: { type: 'number', maximum: 10, exclusiveMaximum: true },
        },
      }),
    ).toEqual({
      type: 'object',
      properties: { n: { type: 'number', exclusiveMaximum: 10 } },
    });
  });

  it('drops boolean exclusive bounds that have no numeric counterpart', () => {
    expect(
      normalizeSchemaForAnthropic({
        type: 'object',
        properties: {
          n: {
            type: 'number',
            exclusiveMinimum: false,
            exclusiveMaximum: true,
          },
        },
      }),
    ).toEqual({
      type: 'object',
      properties: { n: { type: 'number' } },
    });
  });

  it('flattens a top-level oneOf into merged properties', () => {
    expect(
      normalizeSchemaForAnthropic({
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

  it('flattens a top-level allOf and keeps its required fields', () => {
    expect(
      normalizeSchemaForAnthropic({
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

  it('keeps nested oneOf below the top level', () => {
    const schema = {
      type: 'object',
      properties: {
        filter: { oneOf: [{ type: 'string' }, { type: 'number' }] },
      },
    };
    expect(normalizeSchemaForAnthropic(schema)).toEqual(schema);
  });

  it('normalizes draft-04 bounds inside array items and $defs', () => {
    expect(
      normalizeSchemaForAnthropic({
        type: 'object',
        properties: {
          list: {
            type: 'array',
            items: { type: 'integer', minimum: 1, exclusiveMinimum: true },
          },
        },
        $defs: {
          amount: { type: 'number', maximum: 5, exclusiveMaximum: true },
        },
      }),
    ).toEqual({
      type: 'object',
      properties: {
        list: {
          type: 'array',
          items: { type: 'integer', exclusiveMinimum: 1 },
        },
      },
      $defs: { amount: { type: 'number', exclusiveMaximum: 5 } },
    });
  });

  it('collapses tuple-form items arrays into a single anyOf schema', () => {
    expect(
      normalizeSchemaForAnthropic({
        type: 'object',
        properties: {
          point: {
            type: 'array',
            items: [{ type: 'number' }, { type: 'string' }],
          },
        },
      }),
    ).toEqual({
      type: 'object',
      properties: {
        point: {
          type: 'array',
          items: { anyOf: [{ type: 'number' }, { type: 'string' }] },
        },
      },
    });
  });

  it('collects properties from combinators nested inside a branch', () => {
    expect(
      normalizeSchemaForAnthropic({
        type: 'object',
        oneOf: [{ allOf: [{ properties: { a: { type: 'string' } } }] }],
      }),
    ).toEqual({
      type: 'object',
      properties: { a: { type: 'string' } },
    });
  });

  it('hoists branch $defs to the root so $ref pointers still resolve', () => {
    expect(
      normalizeSchemaForAnthropic({
        type: 'object',
        allOf: [
          {
            $defs: {
              Addr: {
                type: 'object',
                properties: { city: { type: 'string' } },
              },
            },
            properties: { home: { $ref: '#/$defs/Addr' } },
            required: ['home'],
          },
        ],
      }),
    ).toEqual({
      type: 'object',
      properties: { home: { $ref: '#/$defs/Addr' } },
      required: ['home'],
      $defs: {
        Addr: { type: 'object', properties: { city: { type: 'string' } } },
      },
    });
  });

  it('coerces a non-object root to an empty object schema', () => {
    expect(normalizeSchemaForAnthropic({ type: 'string' })).toEqual({
      type: 'object',
      properties: {},
    });
  });

  it('does not mutate the input schema', () => {
    const schema = {
      properties: { n: { type: 'number', minimum: 0, exclusiveMinimum: true } },
    };
    const copy = structuredClone(schema);
    normalizeSchemaForAnthropic(schema);
    expect(schema).toEqual(copy);
  });
});
