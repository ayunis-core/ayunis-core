import { describe, expect, it } from 'vitest';

import { schemaAllowsNull } from './schema-nullability';

describe('schemaAllowsNull', () => {
  it('recognizes type null and null in type arrays', () => {
    expect(schemaAllowsNull({ type: 'null' })).toBe(true);
    expect(schemaAllowsNull({ type: ['string', 'null'] })).toBe(true);
    expect(schemaAllowsNull({ type: 'string' })).toBe(false);
    expect(schemaAllowsNull({ type: ['string', 'number'] })).toBe(false);
  });

  it('recognizes null in enums', () => {
    expect(schemaAllowsNull({ enum: ['a', null] })).toBe(true);
    expect(schemaAllowsNull({ enum: ['a'] })).toBe(false);
  });

  it('recognizes const null and rejects other consts', () => {
    expect(schemaAllowsNull({ const: null })).toBe(true);
    expect(schemaAllowsNull({ const: 'x' })).toBe(false);
  });

  it('recognizes null-allowing anyOf and oneOf branches', () => {
    expect(
      schemaAllowsNull({ anyOf: [{ type: 'string' }, { type: 'null' }] }),
    ).toBe(true);
    expect(
      schemaAllowsNull({ oneOf: [{ type: 'string' }, { type: 'null' }] }),
    ).toBe(true);
    expect(schemaAllowsNull({ anyOf: [{ type: 'string' }] })).toBe(false);
    expect(schemaAllowsNull({ oneOf: [{ type: 'string' }] })).toBe(false);
  });

  it('requires every allOf branch to allow null', () => {
    expect(
      schemaAllowsNull({
        allOf: [{ type: ['string', 'null'] }, { type: ['number', 'null'] }],
      }),
    ).toBe(true);
    expect(
      schemaAllowsNull({
        allOf: [{ type: ['string', 'null'] }, { type: 'string' }],
      }),
    ).toBe(false);
  });

  it('treats unconstrained schemas as allowing null', () => {
    expect(schemaAllowsNull({})).toBe(true);
    expect(schemaAllowsNull({ description: 'set null to clear' })).toBe(true);
  });

  it('does not treat implicit object/array shapes or refs as unconstrained', () => {
    expect(schemaAllowsNull({ properties: { q: { type: 'string' } } })).toBe(
      false,
    );
    expect(schemaAllowsNull({ items: { type: 'string' } })).toBe(false);
    expect(schemaAllowsNull({ $ref: '#/$defs/X' })).toBe(false);
    expect(schemaAllowsNull({ not: {} })).toBe(false);
  });

  it('honours openApiNullable only when opted in', () => {
    expect(schemaAllowsNull({ type: 'string', nullable: true })).toBe(false);
    expect(
      schemaAllowsNull(
        { type: 'string', nullable: true },
        { openApiNullable: true },
      ),
    ).toBe(true);
  });

  it('resolves combinator branches through the provided resolver', () => {
    const defs: Record<string, Record<string, unknown>> = {
      MaybeDate: { type: ['string', 'null'] },
    };
    const resolve = (branch: unknown) => {
      if (
        typeof branch === 'object' &&
        branch !== null &&
        '$ref' in branch &&
        typeof branch.$ref === 'string'
      ) {
        return defs[branch.$ref.split('/').pop() ?? ''];
      }
      return typeof branch === 'object' && branch !== null
        ? (branch as Record<string, unknown>)
        : undefined;
    };
    expect(
      schemaAllowsNull(
        { anyOf: [{ $ref: '#/$defs/MaybeDate' }] },
        { resolveBranch: resolve },
      ),
    ).toBe(true);
  });

  it('does not recurse forever on self-referencing branch graphs', () => {
    const cyclic: Record<string, unknown> = {};
    cyclic.anyOf = [cyclic];
    expect(schemaAllowsNull(cyclic)).toBe(false);
  });
});
