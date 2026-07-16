import { stripDisallowedNulls } from './strip-disallowed-nulls.utils';

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
