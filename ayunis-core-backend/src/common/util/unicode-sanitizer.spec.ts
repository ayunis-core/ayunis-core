import {
  sanitizeObject,
  sanitizeUnicodeEscapes,
  toWellFormedText,
} from './unicode-sanitizer';

describe('sanitizeUnicodeEscapes', () => {
  it('removes completed null escapes and real NULL characters', () => {
    expect(sanitizeUnicodeEscapes('a\\u0000b')).toBe('ab');
    expect(sanitizeUnicodeEscapes(`a${String.fromCharCode(0)}b`)).toBe('ab');
  });

  it('fixes broken escape tails at end of string', () => {
    expect(sanitizeUnicodeEscapes('abc\\u00')).toBe('abc');
    expect(sanitizeUnicodeEscapes('abc\\u0')).toBe('abc');
  });

  // A tool result scraped from the web can arrive with a UTF-16 surrogate pair
  // broken in half. JSON.stringify escapes the survivor as \udXXX, which
  // Postgres rejects when the messages.content jsonb row is written ("invalid
  // input syntax for type json"), failing the whole run (AYC-902).
  it('replaces a lone surrogate with the replacement character', () => {
    expect(sanitizeUnicodeEscapes(`ok${String.fromCharCode(0xd83d)} end`)).toBe(
      'ok\uFFFD end',
    );
    expect(sanitizeUnicodeEscapes(`ok${String.fromCharCode(0xdc00)} end`)).toBe(
      'ok\uFFFD end',
    );
  });

  it('keeps an intact emoji unchanged', () => {
    expect(sanitizeUnicodeEscapes('done \u{1F600}')).toBe('done \u{1F600}');
  });

  it('preserves ordinary strings, paths, and valid escapes', () => {
    expect(sanitizeUnicodeEscapes('C:\\Users\\name')).toBe('C:\\Users\\name');
    expect(sanitizeUnicodeEscapes('emoji \\u1F600 ok')).toBe(
      'emoji \\u1F600 ok',
    );
    expect(sanitizeUnicodeEscapes('plain text')).toBe('plain text');
  });

  // Message contents get re-sanitized whenever they are copied (e.g. replayed
  // tool calls rebuilt via the ToolUseMessageContent constructor), so a second
  // pass must never change the result of the first.
  describe('idempotency', () => {
    const adversarial = [
      'A\\u00\\u00000', // removal creates a new broken tail
      '\\u000\\u0000',
      'x\\u0\\u00000y',
      '\\u\\u0000',
      'clean string',
      'tail\\u000',
    ];

    it.each(adversarial)('sanitize(sanitize(%j)) === sanitize(%j)', (input) => {
      const once = sanitizeUnicodeEscapes(input);
      expect(sanitizeUnicodeEscapes(once)).toBe(once);
    });
  });
});

describe('sanitizeObject', () => {
  // Tool params and other untrusted payloads arrive via JSON.parse, which
  // yields `__proto__` as an own key; copying it with bracket assignment
  // would replace the returned object's prototype, so reads of absent fields
  // would resolve to attacker-controlled values.
  it('keeps a __proto__ key as inert data instead of replacing the prototype', () => {
    const parsed = JSON.parse(
      '{"__proto__":{"injected":"yes"},"a":"b"}',
    ) as Record<string, unknown>;

    const result = sanitizeObject(parsed);

    expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
    expect((result as { injected?: unknown }).injected).toBeUndefined();
    expect(result.a).toBe('b');
  });

  it('leaves Object.prototype untouched', () => {
    sanitizeObject(
      JSON.parse('{"__proto__":{"polluted":"yes"}}') as Record<string, unknown>,
    );

    expect(({} as { polluted?: unknown }).polluted).toBeUndefined();
  });

  it('replaces lone surrogates in nested tool params', () => {
    expect(
      sanitizeObject({ query: { terms: [`a${String.fromCharCode(0xd83d)}`] } }),
    ).toEqual({ query: { terms: ['a\uFFFD'] } });
  });

  it('is idempotent over nested structures', () => {
    const input = {
      a: 'A\\u00\\u00000',
      nested: { b: ['\\u000\\u0000', 42, null] },
    };
    const once = sanitizeObject(input);
    expect(sanitizeObject(once)).toEqual(once);
  });
});

describe('toWellFormedText', () => {
  it('replaces a lone surrogate with the replacement character', () => {
    expect(toWellFormedText('a\uD800b')).toBe('a�b');
    expect(toWellFormedText('a\uDC00b')).toBe('a�b');
  });

  it('keeps intact surrogate pairs (emoji) unchanged', () => {
    expect(toWellFormedText('Bericht 📄 fertig')).toBe('Bericht 📄 fertig');
  });

  it('removes NULL characters', () => {
    expect(toWellFormedText(`a${String.fromCharCode(0)}b`)).toBe('ab');
  });

  it('handles a surrogate pair split across a chunk boundary', () => {
    const emoji = '📄';
    const truncatedTail = emoji[0];
    expect(toWellFormedText(`chunk ends mid-pair ${truncatedTail}`)).toBe(
      'chunk ends mid-pair �',
    );
  });

  it('returns well-formed plain text unchanged', () => {
    const text = 'Wie beantrage ich einen Anwohnerparkausweis?';
    expect(toWellFormedText(text)).toBe(text);
  });
});
