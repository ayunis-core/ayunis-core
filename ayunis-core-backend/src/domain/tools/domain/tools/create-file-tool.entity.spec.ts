import { CreateFileTool } from './create-file-tool.entity';

describe('CreateFileTool', () => {
  const tool = new CreateFileTool();
  const params = {
    filename: 'Haushalt',
    format: 'xml',
    content: '<betrag>42</betrag>',
  };

  it.each(['xml', 'json', 'txt'])(
    'accepts %s without interpreting its content',
    (format) => {
      const input = { ...params, format, content: 'Unvalidated text ä\n' };
      expect(tool.validateParams(input)).toEqual(input);
    },
  );

  it('accepts empty files and the content size boundary', () => {
    expect(tool.validateParams({ ...params, content: '' }).content).toBe('');
    expect(
      tool.validateParams({ ...params, content: 'ä'.repeat(100000) }).content,
    ).toHaveLength(100000);
  });

  it.each(['a', '😀'])('accepts 200 filename characters (%s)', (character) => {
    const filename = character.repeat(200);
    expect(tool.validateParams({ ...params, filename }).filename).toBe(
      filename,
    );
  });

  it('rejects filenames exceeding 200 characters', () => {
    expect(() =>
      tool.validateParams({ ...params, filename: 'a'.repeat(201) }),
    ).toThrow();
  });

  it('rejects content exceeding 100000 characters', () => {
    expect(() =>
      tool.validateParams({ ...params, content: 'a'.repeat(100001) }),
    ).toThrow();
  });

  it.each(['filename', 'format', 'content'])('requires %s', (key) => {
    const incomplete: Record<string, unknown> = { ...params };
    delete incomplete[key];
    expect(() => tool.validateParams(incomplete)).toThrow();
  });

  it.each([
    { format: 'html' },
    { content: null },
    { filename: 42 },
    { extra: true },
  ])('rejects invalid input %j', (override) => {
    expect(() => tool.validateParams({ ...params, ...override })).toThrow();
  });

  it('identifies a create_file widget with no PII result', () => {
    expect(tool.name).toBe('create_file');
    expect(tool.returnsPii).toBe(false);
  });
});
