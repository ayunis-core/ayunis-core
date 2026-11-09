import { paginateSourceText } from './source-text-page.utils';

describe('source text continuation', () => {
  it('reads a long physical line end to end without changing citation line numbers', () => {
    const text = 'Council decision. '.repeat(3400);
    let startCharacter = 0;
    const pages: string[] = [];
    for (let count = 0; count < 100; count++) {
      const page = paginateSourceText({
        toolName: 'source_get_text',
        dbResult: { text, totalLines: 1 },
        startLine: 1,
        startCharacter,
        endLine: -1,
        maxLines: 500,
        maxChars: 20000,
      });
      expect(page.actualStartLine).toBe(1);
      expect(page.actualEndLine).toBe(1);
      pages.push(page.text);
      if (!page.nextPosition) break;
      startCharacter = page.nextPosition.startCharacter;
    }
    expect(pages.length).toBeGreaterThan(1);
    expect(pages.join('')).toBe(text);
  });

  it('budgets escaped content and resumes within the correct physical line', () => {
    const text = 'First line\n' + '\u0001"\\'.repeat(10000) + '\nLast line';
    let position = { startLine: 1, startCharacter: 0 };
    const pages: string[] = [];
    for (let count = 0; count < 100; count++) {
      const page = paginateSourceText({
        toolName: 'source_get_text',
        dbResult: {
          text: text
            .split('\n')
            .slice(position.startLine - 1)
            .join('\n'),
          totalLines: 3,
        },
        ...position,
        endLine: -1,
        maxLines: 500,
        maxChars: 20000,
      });
      expect(JSON.stringify(page.text).length).toBeLessThanOrEqual(20002);
      pages.push(page.text);
      if (!page.nextPosition) break;
      position = page.nextPosition;
    }
    expect(pages.join('')).toBe(text);
  });
  it('makes progress on escaped characters even with a tiny configured budget', () => {
    const page = paginateSourceText({
      toolName: 'source_get_text',
      dbResult: { text: '\u0001'.repeat(10), totalLines: 1 },
      startLine: 1,
      startCharacter: 0,
      endLine: -1,
      maxLines: 1,
      maxChars: 1,
    });
    expect(page.text.length).toBeGreaterThan(0);
    expect(page.nextPosition?.startCharacter).toBeGreaterThan(0);
  });

  it('finishes when PostgreSQL maps an empty document line count to NaN', () => {
    const page = paginateSourceText({
      toolName: 'source_get_text',
      dbResult: { text: '', totalLines: Number.NaN },
      startLine: 1,
      startCharacter: 0,
      endLine: -1,
      maxLines: 500,
      maxChars: 20000,
    });
    expect(page).toMatchObject({
      totalLines: 0,
      text: '',
      truncated: false,
      nextPosition: null,
    });
  });
});
