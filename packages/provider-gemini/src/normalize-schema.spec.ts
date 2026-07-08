import { describe, expect, it } from 'vitest';

import { normalizeSchemaForGemini } from './normalize-schema';

describe('normalizeSchemaForGemini', () => {
  it('leaves a plain object schema untouched', () => {
    const schema = {
      type: 'object',
      properties: { q: { type: 'string', description: 'Query' } },
      required: ['q'],
    };
    expect(normalizeSchemaForGemini(schema)).toEqual(schema);
  });

  it('drops keywords outside the Gemini schema subset', () => {
    expect(
      normalizeSchemaForGemini({
        $schema: 'http://json-schema.org/draft-07/schema#',
        type: 'object',
        additionalProperties: false,
        properties: { q: { type: 'string' } },
      }),
    ).toEqual({
      type: 'object',
      properties: { q: { type: 'string' } },
    });
  });

  it('folds draft-04 boolean exclusive bounds into inclusive bounds', () => {
    expect(
      normalizeSchemaForGemini({
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 0, exclusiveMinimum: true },
        },
      }),
    ).toEqual({
      type: 'object',
      properties: { page: { type: 'integer', minimum: 0 } },
    });
  });

  it('folds numeric 2020-12 exclusive bounds into inclusive bounds', () => {
    expect(
      normalizeSchemaForGemini({
        type: 'object',
        properties: {
          page: { type: 'integer', exclusiveMinimum: 0, exclusiveMaximum: 10 },
        },
      }),
    ).toEqual({
      type: 'object',
      properties: { page: { type: 'integer', minimum: 0, maximum: 10 } },
    });
  });

  it('strips formats Gemini does not support but keeps supported ones', () => {
    expect(
      normalizeSchemaForGemini({
        type: 'object',
        properties: {
          url: { type: 'string', format: 'uri' },
          at: { type: 'string', format: 'date-time' },
        },
      }),
    ).toEqual({
      type: 'object',
      properties: {
        url: { type: 'string' },
        at: { type: 'string', format: 'date-time' },
      },
    });
  });

  it('converts nullable type arrays to a single type with nullable', () => {
    expect(
      normalizeSchemaForGemini({
        type: 'object',
        properties: { note: { type: ['string', 'null'] } },
      }),
    ).toEqual({
      type: 'object',
      properties: { note: { type: 'string', nullable: true } },
    });
  });

  it('renames oneOf to the supported anyOf', () => {
    expect(
      normalizeSchemaForGemini({
        type: 'object',
        properties: {
          filter: { oneOf: [{ type: 'string' }, { type: 'integer' }] },
        },
      }),
    ).toEqual({
      type: 'object',
      properties: {
        filter: { anyOf: [{ type: 'string' }, { type: 'integer' }] },
      },
    });
  });

  it('collapses tuple-form items and normalizes each entry', () => {
    expect(
      normalizeSchemaForGemini({
        type: 'array',
        items: [
          { type: 'number', minimum: 0, exclusiveMinimum: true },
          { type: 'string', format: 'uri' },
        ],
      }),
    ).toEqual({
      type: 'array',
      items: {
        anyOf: [{ type: 'number', minimum: 0 }, { type: 'string' }],
      },
    });
  });

  it('recurses into array items', () => {
    expect(
      normalizeSchemaForGemini({
        type: 'array',
        items: { type: 'integer', minimum: 1, exclusiveMinimum: true },
      }),
    ).toEqual({
      type: 'array',
      items: { type: 'integer', minimum: 1 },
    });
  });

  it('does not mutate the input schema', () => {
    const schema = {
      type: 'object',
      properties: { n: { type: ['number', 'null'], exclusiveMinimum: 0 } },
    };
    const copy = structuredClone(schema);
    normalizeSchemaForGemini(schema);
    expect(schema).toEqual(copy);
  });
});
