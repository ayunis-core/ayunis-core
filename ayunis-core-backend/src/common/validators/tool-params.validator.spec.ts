import { validateToolParams } from './tool-params.validator';

describe('validateToolParams', () => {
  const documentSchema = {
    type: 'object',
    properties: {
      title: { type: 'string' },
      content: { type: 'string' },
      format: { type: 'string', enum: ['letter', 'report'] },
    },
    required: ['title', 'content'],
    additionalProperties: false,
  };

  it('returns the params unchanged when they satisfy the schema', () => {
    const params = { title: 'Parkraumkonzept', content: '<h1>Bericht</h1>' };
    expect(validateToolParams(documentSchema, params)).toBe(params);
  });

  it('names a missing required parameter in plain language', () => {
    // Models retry tools based on this text — "missing required parameter
    // 'title'" is actionable where raw ajv JSON was not (AYC-646).
    expect(() =>
      validateToolParams(documentSchema, { content: '<h1>Bericht</h1>' }),
    ).toThrow(/missing required parameter 'title'/);
  });

  it('names an unknown parameter', () => {
    expect(() =>
      validateToolParams(documentSchema, {
        title: 'Bericht',
        content: '<p>Text</p>',
        heading: 'extra',
      }),
    ).toThrow(/unknown parameter 'heading'/);
  });

  it('reports a type mismatch with the expected type', () => {
    expect(() =>
      validateToolParams(documentSchema, { title: 42, content: '<p>Text</p>' }),
    ).toThrow(/'title' must be of type string/);
  });

  it('lists the allowed values for an enum violation', () => {
    expect(() =>
      validateToolParams(documentSchema, {
        title: 'Bericht',
        content: '<p>Text</p>',
        format: 'poster',
      }),
    ).toThrow(/'format' must be one of: letter, report/);
  });

  it('reports nested paths in dot notation', () => {
    const schema = {
      type: 'object',
      properties: {
        edits: {
          type: 'array',
          items: {
            type: 'object',
            properties: { old_text: { type: 'string' } },
            required: ['old_text'],
          },
        },
      },
      required: ['edits'],
    };
    expect(() => validateToolParams(schema, { edits: [{}] })).toThrow(
      /missing required parameter 'edits\.0\.old_text'/,
    );
  });

  it('joins multiple violations into one message', () => {
    expect(() => validateToolParams(documentSchema, {})).toThrow(
      /missing required parameter 'title'.*missing required parameter 'content'/,
    );
  });

  it('names the root for a root-level type violation instead of an empty path', () => {
    const listSchema = { type: 'array' };
    expect(() => validateToolParams(listSchema, {})).toThrow(
      /parameter '\(root\)' must be of type array/,
    );
  });

  it('names the root for a root-level enum violation instead of an empty path', () => {
    const constSchema = { enum: ['fixed'] };
    expect(() => validateToolParams(constSchema, {})).toThrow(
      /parameter '\(root\)' must be one of: fixed/,
    );
  });
});
