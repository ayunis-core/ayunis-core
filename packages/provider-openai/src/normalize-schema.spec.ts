import { describe, expect, it } from 'vitest';

import { normalizeSchemaForOpenAI } from './normalize-schema';

describe('normalizeSchemaForOpenAI', () => {
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
      properties: {
        a: { type: ['string', 'null'] },
        b: { type: ['number', 'null'] },
      },
    });
  });

  it('keeps originally-required properties non-nullable', () => {
    expect(
      normalizeSchemaForOpenAI({
        type: 'object',
        properties: {
          name: { type: 'string' },
          churnDate: { type: 'string', format: 'date' },
        },
        required: ['name'],
      }),
    ).toEqual({
      type: 'object',
      additionalProperties: false,
      required: ['name', 'churnDate'],
      properties: {
        name: { type: 'string' },
        churnDate: { type: ['string', 'null'], format: 'date' },
      },
    });
  });

  it('adds null to the enum of optional enum properties', () => {
    expect(
      normalizeSchemaForOpenAI({
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['active', 'churned'] },
        },
      }),
    ).toEqual({
      type: 'object',
      additionalProperties: false,
      required: ['status'],
      properties: {
        status: { type: ['string', 'null'], enum: ['active', 'churned', null] },
      },
    });
  });

  it('adds a null branch to optional anyOf properties', () => {
    expect(
      normalizeSchemaForOpenAI({
        type: 'object',
        properties: {
          value: { anyOf: [{ type: 'string' }, { type: 'number' }] },
        },
      }),
    ).toEqual({
      type: 'object',
      additionalProperties: false,
      required: ['value'],
      properties: {
        value: {
          anyOf: [{ type: 'string' }, { type: 'number' }, { type: 'null' }],
        },
      },
    });
  });

  it('adds a null branch to optional oneOf properties', () => {
    expect(
      normalizeSchemaForOpenAI({
        type: 'object',
        properties: {
          value: { oneOf: [{ type: 'string' }, { type: 'number' }] },
        },
      }),
    ).toEqual({
      type: 'object',
      additionalProperties: false,
      required: ['value'],
      properties: {
        value: {
          oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'null' }],
        },
      },
    });
  });

  it('leaves oneOf properties that already allow null unchanged', () => {
    expect(
      normalizeSchemaForOpenAI({
        type: 'object',
        properties: {
          value: { oneOf: [{ type: 'string' }, { type: 'null' }] },
        },
      }),
    ).toEqual({
      type: 'object',
      additionalProperties: false,
      required: ['value'],
      properties: {
        value: { oneOf: [{ type: 'string' }, { type: 'null' }] },
      },
    });
  });

  it('makes optional type-less object properties nullable objects', () => {
    expect(
      normalizeSchemaForOpenAI({
        type: 'object',
        properties: {
          filter: { properties: { q: { type: 'string' } } },
        },
      }),
    ).toEqual({
      type: 'object',
      additionalProperties: false,
      required: ['filter'],
      properties: {
        filter: {
          type: ['object', 'null'],
          additionalProperties: false,
          required: ['q'],
          properties: { q: { type: ['string', 'null'] } },
        },
      },
    });
  });

  // Unconstrained schemas (Pydantic `Any`) and `const: null` already accept
  // null — no hatch needed, and none must be invented.
  it('leaves unconstrained and const-null optional properties unchanged', () => {
    expect(
      normalizeSchemaForOpenAI({
        type: 'object',
        properties: {
          anything: { description: 'any value' },
          sentinel: { const: null },
        },
      }),
    ).toEqual({
      type: 'object',
      additionalProperties: false,
      required: ['anything', 'sentinel'],
      properties: {
        anything: { description: 'any value' },
        sentinel: { const: null },
      },
    });
  });

  it('leaves already-nullable optional properties unchanged', () => {
    expect(
      normalizeSchemaForOpenAI({
        type: 'object',
        properties: { v: { type: ['string', 'null'] } },
      }),
    ).toEqual({
      type: 'object',
      additionalProperties: false,
      required: ['v'],
      properties: { v: { type: ['string', 'null'] } },
    });
  });

  it('makes optional properties of nested objects nullable', () => {
    expect(
      normalizeSchemaForOpenAI({
        type: 'object',
        properties: {
          filter: {
            type: 'object',
            properties: { q: { type: 'string' } },
          },
        },
      }),
    ).toEqual({
      type: 'object',
      additionalProperties: false,
      required: ['filter'],
      properties: {
        filter: {
          type: ['object', 'null'],
          additionalProperties: false,
          required: ['q'],
          properties: { q: { type: ['string', 'null'] } },
        },
      },
    });
  });

  // Regression: MCP filter tools with all-optional date fields must not force
  // the model to fabricate values — each field needs a null escape hatch.
  it('makes every property of an all-optional MCP filter schema nullable', () => {
    expect(
      normalizeSchemaForOpenAI({
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Customer name to search for' },
          customfieldChurnDate: { type: 'string', format: 'date' },
          customfieldContractStartDate: { type: 'string', format: 'date' },
          customfieldGoLiveDatum: { type: 'string', format: 'date' },
        },
      }),
    ).toEqual({
      type: 'object',
      additionalProperties: false,
      required: [
        'name',
        'customfieldChurnDate',
        'customfieldContractStartDate',
        'customfieldGoLiveDatum',
      ],
      properties: {
        name: {
          type: ['string', 'null'],
          description: 'Customer name to search for',
        },
        customfieldChurnDate: { type: ['string', 'null'], format: 'date' },
        customfieldContractStartDate: {
          type: ['string', 'null'],
          format: 'date',
        },
        customfieldGoLiveDatum: { type: ['string', 'null'], format: 'date' },
      },
    });
  });

  // $ref carries no type/enum/anyOf to extend, so optionality needs OpenAI's
  // documented pattern: wrap the ref in anyOf with a null branch. Definitions
  // themselves are normalized like any other object schema.
  it('gives optional $ref properties a null escape hatch via anyOf', () => {
    expect(
      normalizeSchemaForOpenAI({
        type: 'object',
        properties: { filter: { $ref: '#/$defs/Filter' } },
        $defs: {
          Filter: { type: 'object', properties: { q: { type: 'string' } } },
        },
      }),
    ).toEqual({
      type: 'object',
      additionalProperties: false,
      required: ['filter'],
      properties: {
        filter: { anyOf: [{ $ref: '#/$defs/Filter' }, { type: 'null' }] },
      },
      $defs: {
        Filter: {
          type: 'object',
          additionalProperties: false,
          required: ['q'],
          properties: { q: { type: ['string', 'null'] } },
        },
      },
    });
  });

  // Pydantic v1 wraps a nested-model field in `allOf: [{$ref}]` as soon as it
  // carries a description or default. Strict mode rejects `allOf` outright and
  // it cannot take a null branch (AND semantics would make the property
  // unsatisfiable), so a single branch is collapsed into the property instead —
  // the ref then picks up the normal anyOf escape hatch.
  it('collapses single-branch allOf and gives the optional ref a null hatch', () => {
    expect(
      normalizeSchemaForOpenAI({
        type: 'object',
        properties: {
          filter: { allOf: [{ $ref: '#/$defs/Filter' }], description: 'opt' },
        },
        $defs: {
          Filter: { type: 'object', properties: { q: { type: 'string' } } },
        },
      }),
    ).toEqual({
      type: 'object',
      additionalProperties: false,
      required: ['filter'],
      properties: {
        filter: {
          anyOf: [
            { $ref: '#/$defs/Filter', description: 'opt' },
            { type: 'null' },
          ],
        },
      },
      $defs: {
        Filter: {
          type: 'object',
          additionalProperties: false,
          required: ['q'],
          properties: { q: { type: ['string', 'null'] } },
        },
      },
    });
  });

  it('collapses single-branch allOf on required properties without a null hatch', () => {
    expect(
      normalizeSchemaForOpenAI({
        type: 'object',
        properties: { filter: { allOf: [{ $ref: '#/$defs/Filter' }] } },
        required: ['filter'],
        $defs: {
          Filter: { type: 'object', properties: { q: { type: 'string' } } },
        },
      }),
    ).toEqual({
      type: 'object',
      additionalProperties: false,
      required: ['filter'],
      properties: { filter: { $ref: '#/$defs/Filter' } },
      $defs: {
        Filter: {
          type: 'object',
          additionalProperties: false,
          required: ['q'],
          properties: { q: { type: ['string', 'null'] } },
        },
      },
    });
  });

  it('collapses a single-branch allOf carrying an inline object schema', () => {
    expect(
      normalizeSchemaForOpenAI({
        type: 'object',
        properties: {
          filter: {
            allOf: [{ type: 'object', properties: { q: { type: 'string' } } }],
          },
        },
      }),
    ).toEqual({
      type: 'object',
      additionalProperties: false,
      required: ['filter'],
      properties: {
        filter: {
          type: ['object', 'null'],
          additionalProperties: false,
          required: ['q'],
          properties: { q: { type: ['string', 'null'] } },
        },
      },
    });
  });

  // Merging multiple branches needs a real constraint merge; such schemas are
  // rare and strict mode rejects them either way, so they pass through.
  it('leaves multi-branch allOf untouched', () => {
    const multi = {
      type: 'object',
      properties: {
        f: { allOf: [{ type: 'string' }, { minLength: 2 }] },
      },
    };
    const result = normalizeSchemaForOpenAI(multi) as {
      properties: { f: unknown };
    };
    expect(result.properties.f).toEqual({
      allOf: [{ type: 'string' }, { minLength: 2 }],
    });
  });

  it('keeps originally-required $ref properties unwrapped', () => {
    expect(
      normalizeSchemaForOpenAI({
        type: 'object',
        properties: { filter: { $ref: '#/$defs/Filter' } },
        required: ['filter'],
        $defs: {
          Filter: { type: 'object', properties: { q: { type: 'string' } } },
        },
      }),
    ).toEqual({
      type: 'object',
      additionalProperties: false,
      required: ['filter'],
      properties: { filter: { $ref: '#/$defs/Filter' } },
      $defs: {
        Filter: {
          type: 'object',
          additionalProperties: false,
          required: ['q'],
          properties: { q: { type: ['string', 'null'] } },
        },
      },
    });
  });

  it('does not mutate the input schema', () => {
    const input = {
      type: 'object',
      properties: { a: { type: 'string' } },
    };
    const snapshot = JSON.parse(JSON.stringify(input)) as typeof input;
    normalizeSchemaForOpenAI(input);
    expect(input).toEqual(snapshot);
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
      properties: { a: { type: ['string', 'null'] } },
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
      properties: { a: { type: ['string', 'null'] } },
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

  it('flattens top-level combinators, which strict mode rejects', () => {
    // Each property is required in only one oneOf branch, so neither is
    // globally required — both get the nullable treatment.
    expect(
      normalizeSchemaForOpenAI({
        type: 'object',
        oneOf: [
          { properties: { a: { type: 'string' } }, required: ['a'] },
          { properties: { b: { type: 'number' } }, required: ['b'] },
        ],
      }),
    ).toEqual({
      type: 'object',
      additionalProperties: false,
      properties: {
        a: { type: ['string', 'null'] },
        b: { type: ['number', 'null'] },
      },
      required: ['a', 'b'],
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
        page: { type: ['integer', 'null'], exclusiveMinimum: 0 },
        size: { type: ['integer', 'null'], exclusiveMaximum: 10 },
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
      properties: { n: { type: ['number', 'null'] } },
    });
  });
});
