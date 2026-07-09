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

  it('adds type object to nodes declaring properties without a type', () => {
    expect(
      normalizeSchemaForGemini({
        type: 'object',
        properties: {
          choice: {
            anyOf: [
              { properties: { a: { type: 'string' } } },
              { properties: { b: { type: 'number' } } },
            ],
          },
        },
      }),
    ).toEqual({
      type: 'object',
      properties: {
        choice: {
          anyOf: [
            { type: 'object', properties: { a: { type: 'string' } } },
            { type: 'object', properties: { b: { type: 'number' } } },
          ],
        },
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

  it('merges allOf branches into the node, unioning required', () => {
    expect(
      normalizeSchemaForGemini({
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

  it('merges allOf nested inside branches and on property nodes', () => {
    expect(
      normalizeSchemaForGemini({
        type: 'object',
        properties: {
          item: {
            allOf: [
              { properties: { a: { type: 'string' } } },
              { allOf: [{ properties: { b: { type: 'number' } } }] },
            ],
          },
        },
      }),
    ).toEqual({
      type: 'object',
      properties: {
        item: {
          type: 'object',
          properties: { a: { type: 'string' }, b: { type: 'number' } },
        },
      },
    });
  });

  it('inlines local $refs and drops the defs collections', () => {
    expect(
      normalizeSchemaForGemini({
        type: 'object',
        $defs: {
          Addr: {
            type: 'object',
            properties: { street: { type: 'string' } },
            description: 'An address',
          },
        },
        properties: {
          home: { $ref: '#/$defs/Addr', description: 'Home address' },
        },
      }),
    ).toEqual({
      type: 'object',
      properties: {
        home: {
          type: 'object',
          properties: { street: { type: 'string' } },
          // Sibling keys next to $ref override the referenced schema.
          description: 'Home address',
        },
      },
    });
  });

  it('inlines refs through the draft-04 definitions key', () => {
    expect(
      normalizeSchemaForGemini({
        type: 'object',
        definitions: { Id: { type: 'string' } },
        properties: { id: { $ref: '#/definitions/Id' } },
      }),
    ).toEqual({
      type: 'object',
      properties: { id: { type: 'string' } },
    });
  });

  it('cuts recursive $refs instead of expanding forever', () => {
    expect(
      normalizeSchemaForGemini({
        type: 'object',
        $defs: {
          Node: {
            type: 'object',
            properties: { child: { $ref: '#/$defs/Node' } },
          },
        },
        properties: { tree: { $ref: '#/$defs/Node' } },
      }),
    ).toEqual({
      type: 'object',
      properties: {
        tree: { type: 'object', properties: { child: {} } },
      },
    });
  });

  it('expands multi-type arrays into anyOf branches', () => {
    expect(
      normalizeSchemaForGemini({
        type: 'object',
        properties: { id: { type: ['string', 'integer', 'null'] } },
      }),
    ).toEqual({
      type: 'object',
      properties: {
        id: {
          nullable: true,
          anyOf: [{ type: 'string' }, { type: 'integer' }],
        },
      },
    });
  });

  it('concatenates oneOf into an existing anyOf instead of dropping it', () => {
    expect(
      normalizeSchemaForGemini({
        type: 'object',
        properties: {
          v: {
            anyOf: [{ type: 'string' }],
            oneOf: [{ type: 'object', properties: { a: { type: 'string' } } }],
          },
        },
      }),
    ).toEqual({
      type: 'object',
      properties: {
        v: {
          anyOf: [
            { type: 'string' },
            { type: 'object', properties: { a: { type: 'string' } } },
          ],
        },
      },
    });
  });

  it('keeps oneOf branches when a type union already produced anyOf', () => {
    expect(
      normalizeSchemaForGemini({
        type: 'object',
        properties: {
          v: {
            type: ['string', 'integer'],
            oneOf: [{ type: 'object', properties: { a: { type: 'boolean' } } }],
          },
        },
      }),
    ).toEqual({
      type: 'object',
      properties: {
        v: {
          anyOf: [
            { type: 'string' },
            { type: 'integer' },
            { type: 'object', properties: { a: { type: 'boolean' } } },
          ],
        },
      },
    });
  });

  it('caps runaway expansion of acyclic ref chains (billion laughs)', () => {
    // Each def references the previous one twice — uncapped inlining would
    // expand to 2^18 leaf nodes from a few hundred bytes of schema.
    const defs: Record<string, unknown> = { d0: { type: 'string' } };
    for (let i = 1; i <= 18; i += 1) {
      defs[`d${i}`] = {
        type: 'object',
        properties: {
          a: { $ref: `#/$defs/d${i - 1}` },
          b: { $ref: `#/$defs/d${i - 1}` },
        },
      };
    }
    const out = normalizeSchemaForGemini({
      type: 'object',
      $defs: defs,
      properties: { root: { $ref: '#/$defs/d18' } },
    });
    expect(JSON.stringify(out).length).toBeLessThan(100_000);
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
