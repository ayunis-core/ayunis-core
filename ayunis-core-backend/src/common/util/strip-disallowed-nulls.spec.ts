import { stripDisallowedNulls } from './strip-disallowed-nulls';

describe('stripDisallowedNulls', () => {
  it('removes null params the schema does not allow to be null', () => {
    const schema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
        churnDate: { type: 'string', format: 'date' },
      },
    };
    expect(
      stripDisallowedNulls(
        { name: 'Stadt Ladenburg', churnDate: null },
        schema,
      ),
    ).toEqual({ name: 'Stadt Ladenburg' });
  });

  it('keeps null when the property type includes null', () => {
    const schema = {
      type: 'object',
      properties: { note: { type: ['string', 'null'] } },
    };
    expect(stripDisallowedNulls({ note: null }, schema)).toEqual({
      note: null,
    });
  });

  it('keeps null when an anyOf branch allows null', () => {
    const schema = {
      type: 'object',
      properties: {
        value: { anyOf: [{ type: 'string' }, { type: 'null' }] },
      },
    };
    expect(stripDisallowedNulls({ value: null }, schema)).toEqual({
      value: null,
    });
  });

  it('keeps null when a oneOf branch allows null', () => {
    const schema = {
      type: 'object',
      properties: {
        value: { oneOf: [{ type: 'string' }, { type: 'null' }] },
      },
    };
    expect(stripDisallowedNulls({ value: null }, schema)).toEqual({
      value: null,
    });
  });

  it('strips null when no oneOf branch allows null', () => {
    const schema = {
      type: 'object',
      properties: {
        value: { oneOf: [{ type: 'string' }, { type: 'number' }] },
      },
    };
    expect(stripDisallowedNulls({ value: null }, schema)).toEqual({});
  });

  it('keeps null when the enum contains null', () => {
    const schema = {
      type: 'object',
      properties: { status: { enum: ['active', null] } },
    };
    expect(stripDisallowedNulls({ status: null }, schema)).toEqual({
      status: null,
    });
  });

  it('keeps nulls for properties the schema does not describe', () => {
    const schema = {
      type: 'object',
      properties: { known: { type: 'string' } },
    };
    expect(stripDisallowedNulls({ unknown: null }, schema)).toEqual({
      unknown: null,
    });
  });

  it('recurses into nested objects', () => {
    const schema = {
      type: 'object',
      properties: {
        filter: {
          type: 'object',
          properties: { q: { type: 'string' }, date: { type: 'string' } },
        },
      },
    };
    expect(
      stripDisallowedNulls({ filter: { q: 'x', date: null } }, schema),
    ).toEqual({ filter: { q: 'x' } });
  });

  it('recurses into arrays of objects via items', () => {
    const schema = {
      type: 'object',
      properties: {
        filters: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              field: { type: 'string' },
              value: { type: 'string' },
            },
          },
        },
      },
    };
    expect(
      stripDisallowedNulls(
        { filters: [{ field: 'name', value: null }] },
        schema,
      ),
    ).toEqual({ filters: [{ field: 'name' }] });
  });

  it('returns params unchanged when the schema declares no properties', () => {
    expect(stripDisallowedNulls({ a: null }, { type: 'object' })).toEqual({
      a: null,
    });
    expect(stripDisallowedNulls({ a: null }, undefined)).toEqual({ a: null });
  });

  it('keeps non-null values untouched', () => {
    const schema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
        count: { type: 'number' },
        active: { type: 'boolean' },
      },
    };
    const params = { name: 'x', count: 0, active: false };
    expect(stripDisallowedNulls(params, schema)).toEqual(params);
  });

  // Pydantic's `Optional[Model]` / `Optional[List[Model]]` wrap the object
  // shape in a combinator (`anyOf: [{$ref}, {type: 'null'}]`); the strict-mode
  // normalizer descends into those shapes and invites nulls there, so the
  // strip must descend the same way.
  describe('combinator descent', () => {
    it('strips disallowed nulls inside objects wrapped in anyOf', () => {
      const schema = {
        type: 'object',
        properties: {
          sub: { anyOf: [{ $ref: '#/$defs/Sub' }, { type: 'null' }] },
        },
        $defs: {
          Sub: {
            type: 'object',
            properties: { req: { type: 'string' }, opt: { type: 'string' } },
            required: ['req'],
          },
        },
      };
      expect(
        stripDisallowedNulls({ sub: { req: 'a', opt: null } }, schema),
      ).toEqual({ sub: { req: 'a' } });
    });

    it('keeps a null for the combinator-wrapped property itself', () => {
      const schema = {
        type: 'object',
        properties: {
          sub: { anyOf: [{ $ref: '#/$defs/Sub' }, { type: 'null' }] },
        },
        $defs: {
          Sub: { type: 'object', properties: { req: { type: 'string' } } },
        },
      };
      expect(stripDisallowedNulls({ sub: null }, schema)).toEqual({
        sub: null,
      });
    });

    it('strips disallowed nulls inside arrays wrapped in anyOf', () => {
      const schema = {
        type: 'object',
        properties: {
          subs: {
            anyOf: [
              { type: 'array', items: { $ref: '#/$defs/Sub' } },
              { type: 'null' },
            ],
          },
        },
        $defs: {
          Sub: {
            type: 'object',
            properties: { req: { type: 'string' }, opt: { type: 'string' } },
          },
        },
      };
      expect(
        stripDisallowedNulls({ subs: [{ req: 'a', opt: null }] }, schema),
      ).toEqual({ subs: [{ req: 'a' }] });
    });

    it('strips disallowed nulls inside objects wrapped in allOf', () => {
      const schema = {
        type: 'object',
        properties: {
          sub: { allOf: [{ $ref: '#/$defs/Sub' }], description: 'x' },
        },
        $defs: {
          Sub: { type: 'object', properties: { opt: { type: 'string' } } },
        },
      };
      expect(stripDisallowedNulls({ sub: { opt: null } }, schema)).toEqual({
        sub: {},
      });
    });

    // The OpenAI normalizer collapses this Pydantic v1 shape and hatches the
    // ref, so nulls arrive inside the referenced model — the strip runs
    // against the original, uncollapsed schema.
    it('strips disallowed nulls inside a single-branch allOf ref with siblings', () => {
      const schema = {
        type: 'object',
        properties: {
          filter: { allOf: [{ $ref: '#/$defs/Filter' }], description: 'opt' },
        },
        $defs: {
          Filter: {
            type: 'object',
            properties: { q: { type: 'string' }, date: { type: 'string' } },
          },
        },
      };
      expect(
        stripDisallowedNulls({ filter: { q: 'x', date: null } }, schema),
      ).toEqual({ filter: { q: 'x' } });
    });

    it('strips against root-level combinator schemas', () => {
      const schema = {
        anyOf: [
          { type: 'object', properties: { date: { type: 'string' } } },
          { type: 'null' },
        ],
      };
      expect(stripDisallowedNulls({ date: null }, schema)).toEqual({});
    });

    it('leaves params untouched when multiple object branches are ambiguous', () => {
      const schema = {
        type: 'object',
        properties: {
          sub: {
            anyOf: [
              { type: 'object', properties: { a: { type: 'string' } } },
              {
                type: 'object',
                properties: { a: { type: ['string', 'null'] } },
              },
            ],
          },
        },
      };
      expect(stripDisallowedNulls({ sub: { a: null } }, schema)).toEqual({
        sub: { a: null },
      });
    });
  });

  describe('nested arrays', () => {
    it('strips disallowed nulls inside arrays of arrays', () => {
      const schema = {
        type: 'object',
        properties: {
          matrix: {
            type: 'array',
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: { v: { type: 'number' } },
              },
            },
          },
        },
      };
      expect(stripDisallowedNulls({ matrix: [[{ v: null }]] }, schema)).toEqual(
        { matrix: [[{}]] },
      );
    });
  });

  // Schemas that genuinely permit null must keep it — a model may send null
  // deliberately (e.g. "null clears the field").
  describe('permissive schemas', () => {
    it('keeps null for unconstrained property schemas', () => {
      const schema = {
        type: 'object',
        properties: {
          anything: {},
          documented: { description: 'set null to clear' },
        },
      };
      expect(
        stripDisallowedNulls({ anything: null, documented: null }, schema),
      ).toEqual({ anything: null, documented: null });
    });

    it('keeps null when const is null and strips other consts', () => {
      const schema = {
        type: 'object',
        properties: {
          sentinel: { const: null },
          pinned: { const: 'x' },
        },
      };
      expect(
        stripDisallowedNulls({ sentinel: null, pinned: null }, schema),
      ).toEqual({ sentinel: null });
    });

    it('keeps null for OpenAPI-style nullable properties', () => {
      const schema = {
        type: 'object',
        properties: { date: { type: 'string', nullable: true } },
      };
      expect(stripDisallowedNulls({ date: null }, schema)).toEqual({
        date: null,
      });
    });

    it('keeps null when every allOf branch allows null, strips otherwise', () => {
      const schema = {
        type: 'object',
        properties: {
          both: { allOf: [{ type: ['string', 'null'] }] },
          mixed: { allOf: [{ type: ['string', 'null'] }, { type: 'string' }] },
        },
      };
      expect(stripDisallowedNulls({ both: null, mixed: null }, schema)).toEqual(
        { both: null },
      );
    });
  });

  // Model output is untrusted JSON, and JSON.parse yields `__proto__` as an
  // own key — copying it with bracket assignment would replace the result's
  // prototype, so reads of absent fields would resolve to model-controlled
  // values.
  it('keeps a __proto__ key as inert data instead of replacing the prototype', () => {
    const schema = {
      type: 'object',
      properties: { date: { type: 'string' } },
    };
    const params = JSON.parse(
      '{"__proto__":{"injected":"yes"},"date":null,"name":"x"}',
    ) as Record<string, unknown>;

    const result = stripDisallowedNulls(params, schema);

    expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
    expect((result as { injected?: unknown }).injected).toBeUndefined();
    expect(result.date).toBeUndefined();
    expect(result.name).toBe('x');
  });

  // Callers replaying persisted messages use reference identity to detect
  // whether anything was stripped, so a no-op pass must return the input
  // object itself, not an equal copy.
  describe('identity preservation', () => {
    it('returns the same object when no null was stripped', () => {
      const schema = {
        type: 'object',
        properties: { name: { type: 'string' } },
      };
      const params = { name: 'x' };
      expect(stripDisallowedNulls(params, schema)).toBe(params);
    });

    it('returns the same object when nulls are allowed by the schema', () => {
      const schema = {
        type: 'object',
        properties: { note: { type: ['string', 'null'] } },
      };
      const params = { note: null };
      expect(stripDisallowedNulls(params, schema)).toBe(params);
    });

    it('returns the same object when nothing changes in nested content', () => {
      const schema = {
        type: 'object',
        properties: {
          filter: { type: 'object', properties: { q: { type: 'string' } } },
          tags: {
            type: 'array',
            items: { type: 'object', properties: { v: { type: 'string' } } },
          },
        },
      };
      const params = { filter: { q: 'x' }, tags: [{ v: 'y' }] };
      expect(stripDisallowedNulls(params, schema)).toBe(params);
    });

    it('returns a new object when a null was stripped', () => {
      const schema = {
        type: 'object',
        properties: { date: { type: 'string' } },
      };
      const params = { name: 'x', date: null };
      const result = stripDisallowedNulls(params, schema);
      expect(result).not.toBe(params);
      expect(params).toEqual({ name: 'x', date: null });
    });

    it('returns a new object when a nested null was stripped', () => {
      const schema = {
        type: 'object',
        properties: {
          filter: { type: 'object', properties: { date: { type: 'string' } } },
        },
      };
      const params = { filter: { date: null } };
      expect(stripDisallowedNulls(params, schema)).not.toBe(params);
    });
  });

  // Pydantic-based MCP servers describe nested params via $ref/$defs; the
  // strict-mode null escape hatch is applied inside those definitions too,
  // so stripping must resolve refs to reach the nulls.
  describe('$ref resolution', () => {
    it('strips disallowed nulls inside objects referenced via $defs', () => {
      const schema = {
        type: 'object',
        properties: { filter: { $ref: '#/$defs/Filter' } },
        $defs: {
          Filter: {
            type: 'object',
            properties: { q: { type: 'string' }, date: { type: 'string' } },
          },
        },
      };
      expect(
        stripDisallowedNulls({ filter: { q: 'x', date: null } }, schema),
      ).toEqual({ filter: { q: 'x' } });
    });

    it('strips disallowed nulls inside objects referenced via definitions', () => {
      const schema = {
        type: 'object',
        properties: { filter: { $ref: '#/definitions/Filter' } },
        definitions: {
          Filter: {
            type: 'object',
            properties: { date: { type: 'string' } },
          },
        },
      };
      expect(stripDisallowedNulls({ filter: { date: null } }, schema)).toEqual({
        filter: {},
      });
    });

    it('strips a null param whose referenced definition disallows null', () => {
      const schema = {
        type: 'object',
        properties: { filter: { $ref: '#/$defs/Filter' } },
        $defs: {
          Filter: { type: 'object', properties: { q: { type: 'string' } } },
        },
      };
      expect(stripDisallowedNulls({ filter: null }, schema)).toEqual({});
    });

    it('keeps null when the referenced definition allows null', () => {
      const schema = {
        type: 'object',
        properties: { date: { $ref: '#/$defs/MaybeDate' } },
        $defs: { MaybeDate: { type: ['string', 'null'] } },
      };
      expect(stripDisallowedNulls({ date: null }, schema)).toEqual({
        date: null,
      });
    });

    it('keeps null when an anyOf branch references a null-allowing definition', () => {
      const schema = {
        type: 'object',
        properties: {
          value: { anyOf: [{ $ref: '#/$defs/MaybeDate' }] },
        },
        $defs: { MaybeDate: { type: ['string', 'null'] } },
      };
      expect(stripDisallowedNulls({ value: null }, schema)).toEqual({
        value: null,
      });
    });

    it('keeps null when a oneOf branch references a null-allowing definition', () => {
      const schema = {
        type: 'object',
        properties: {
          value: { oneOf: [{ $ref: '#/$defs/MaybeDate' }] },
        },
        $defs: { MaybeDate: { type: ['string', 'null'] } },
      };
      expect(stripDisallowedNulls({ value: null }, schema)).toEqual({
        value: null,
      });
    });

    it('resolves $ref inside array items', () => {
      const schema = {
        type: 'object',
        properties: {
          filters: { type: 'array', items: { $ref: '#/$defs/Filter' } },
        },
        $defs: {
          Filter: {
            type: 'object',
            properties: {
              field: { type: 'string' },
              value: { type: 'string' },
            },
          },
        },
      };
      expect(
        stripDisallowedNulls(
          { filters: [{ field: 'name', value: null }] },
          schema,
        ),
      ).toEqual({ filters: [{ field: 'name' }] });
    });

    it('follows chains of $refs', () => {
      const schema = {
        type: 'object',
        properties: { filter: { $ref: '#/$defs/FilterAlias' } },
        $defs: {
          FilterAlias: { $ref: '#/$defs/Filter' },
          Filter: {
            type: 'object',
            properties: { date: { type: 'string' } },
          },
        },
      };
      expect(stripDisallowedNulls({ filter: { date: null } }, schema)).toEqual({
        filter: {},
      });
    });

    it('keeps values untouched when a $ref does not resolve', () => {
      const schema = {
        type: 'object',
        properties: { filter: { $ref: '#/$defs/Missing' } },
        $defs: {},
      };
      expect(stripDisallowedNulls({ filter: null }, schema)).toEqual({
        filter: null,
      });
    });

    it('handles recursive definitions without infinite recursion', () => {
      const schema = {
        type: 'object',
        properties: { root: { $ref: '#/$defs/Node' } },
        $defs: {
          Node: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              child: { $ref: '#/$defs/Node' },
              date: { type: 'string' },
            },
          },
        },
      };
      expect(
        stripDisallowedNulls(
          { root: { name: 'a', date: null, child: { name: 'b', date: null } } },
          schema,
        ),
      ).toEqual({ root: { name: 'a', child: { name: 'b' } } });
    });

    it('does not hang on circular $ref chains', () => {
      const schema = {
        type: 'object',
        properties: { a: { $ref: '#/$defs/A' } },
        $defs: { A: { $ref: '#/$defs/B' }, B: { $ref: '#/$defs/A' } },
      };
      expect(stripDisallowedNulls({ a: null }, schema)).toEqual({ a: null });
    });
  });

  // Regression for the Startdeliver ticket: a strict-mode model answers a
  // plain name search with null for every optional date filter — none of
  // those nulls may reach the MCP server.
  it('strips all-null optional date filters from an MCP search call', () => {
    const schema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
        customfieldChurnDate: { type: 'string', format: 'date' },
        customfieldContractStartDate: { type: 'string', format: 'date' },
        customfieldGoLiveDatum: { type: 'string', format: 'date' },
      },
    };
    expect(
      stripDisallowedNulls(
        {
          name: 'Stadt Ladenburg',
          customfieldChurnDate: null,
          customfieldContractStartDate: null,
          customfieldGoLiveDatum: null,
        },
        schema,
      ),
    ).toEqual({ name: 'Stadt Ladenburg' });
  });
});
