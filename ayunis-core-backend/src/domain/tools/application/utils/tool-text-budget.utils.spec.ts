import {
  serializeTextResult,
  textPrefixWithinBudget,
} from './tool-text-budget.utils';

describe('text tool wire budget', () => {
  it('counts JSON escaping rather than raw characters', () => {
    const text = '\u0001"\\'.repeat(10000);
    const prefix = textPrefixWithinBudget(text, 20000);
    const response = serializeTextResult(
      {
        text: prefix,
        nextPage: { startLine: 1, startCharacter: prefix.length },
      },
      'source_get_text',
    );
    expect(response.length).toBeLessThan(30000);
    expect(JSON.parse(response).text).toBe(text.slice(0, prefix.length));
  });

  it('rejects oversized metadata instead of silently cutting the result JSON', () => {
    expect(() =>
      serializeTextResult(
        { text: 'Read the next page', title: 'x'.repeat(30000) },
        'website_content',
      ),
    ).toThrow('safe response size');
  });

  it('does not split a supplementary Unicode character', () => {
    const text = 'Decision 🏛 approved';
    const prefix = textPrefixWithinBudget(text, 10);
    expect(prefix).toBe('Decision ');
  });
});
