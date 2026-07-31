import { sanitizeObject, sanitizeUnicodeEscapes } from './unicode-sanitizer';

describe('sanitizeUnicodeEscapes', () => {
  it('removes completed null escapes and real NULL characters', () => {
    expect(sanitizeUnicodeEscapes('a\\u0000b')).toBe('ab');
    expect(sanitizeUnicodeEscapes(`a${String.fromCharCode(0)}b`)).toBe('ab');
  });

  it('fixes broken escape tails at end of string', () => {
    expect(sanitizeUnicodeEscapes('abc\\u00')).toBe('abc');
    expect(sanitizeUnicodeEscapes('abc\\u0')).toBe('abc');
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

  it('is idempotent over nested structures', () => {
    const input = {
      a: 'A\\u00\\u00000',
      nested: { b: ['\\u000\\u0000', 42, null] },
    };
    const once = sanitizeObject(input);
    expect(sanitizeObject(once)).toEqual(once);
  });
});
