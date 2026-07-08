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

  it('collapses tuple-form items into a single anyOf schema', () => {
    expect(
      normalizeSchemaForOpenAI({
        type: 'array',
        items: [{ type: 'string', format: 'uri' }, { type: 'number' }],
      }),
    ).toEqual({
      type: 'array',
      items: { anyOf: [{ type: 'string' }, { type: 'number' }] },
    });
  });

  it('converts draft-04 boolean exclusive bounds to their numeric form', () => {
    expect(
      normalizeSchemaForOpenAI({
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 0, exclusiveMinimum: true },
          size: { type: 'integer', maximum: 10, exclusiveMaximum: true },
        },
      }),
    ).toEqual({
      type: 'object',
      additionalProperties: false,
      required: ['page', 'size'],
      properties: {
        page: { type: 'integer', exclusiveMinimum: 0 },
        size: { type: 'integer', exclusiveMaximum: 10 },
      },
    });
  });

  it('drops boolean exclusive bounds without a numeric counterpart', () => {
    expect(
      normalizeSchemaForOpenAI({
        type: 'object',
        properties: { n: { type: 'number', exclusiveMinimum: false } },
      }),
    ).toEqual({
      type: 'object',
      additionalProperties: false,
      required: ['n'],
      properties: { n: { type: 'number' } },
    });
  });
});
