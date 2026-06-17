import { describe, expect, it } from 'vitest';

import { normalizeSchemaForOpenAI } from './normalize-schema';

describe('normalizeSchemaForOpenAI', () => {
  it('returns undefined for undefined input', () => {
    expect(normalizeSchemaForOpenAI(undefined)).toBeUndefined();
  });

  it('adds additionalProperties:false and required for objects', () => {
    expect(
      normalizeSchemaForOpenAI({
        type: 'object',
        properties: { a: { type: 'string' }, b: { type: 'number' } },
      }),
    ).toEqual({
      type: 'object',
      additionalProperties: false,
      required: ['a', 'b'],
      properties: { a: { type: 'string' }, b: { type: 'number' } },
    });
  });

  it('forces additionalProperties:false when the schema sets it to true', () => {
    expect(
      normalizeSchemaForOpenAI({
        type: 'object',
        additionalProperties: true,
        properties: { a: { type: 'string' } },
      }),
    ).toEqual({
      type: 'object',
      additionalProperties: false,
      required: ['a'],
      properties: { a: { type: 'string' } },
    });
  });

  it('normalizes object schemas that declare properties without type:object', () => {
    expect(
      normalizeSchemaForOpenAI({
        properties: { a: { type: 'string' } },
      }),
    ).toEqual({
      additionalProperties: false,
      required: ['a'],
      properties: { a: { type: 'string' } },
    });
  });

  it('strips unsupported formats but keeps supported ones', () => {
    expect(normalizeSchemaForOpenAI({ type: 'string', format: 'uri' })).toEqual(
      { type: 'string' },
    );
    expect(
      normalizeSchemaForOpenAI({ type: 'string', format: 'date-time' }),
    ).toEqual({ type: 'string', format: 'date-time' });
  });

  it('recurses into array items', () => {
    expect(
      normalizeSchemaForOpenAI({
        type: 'array',
        items: { type: 'string', format: 'uri' },
      }),
    ).toEqual({ type: 'array', items: { type: 'string' } });
  });
});
