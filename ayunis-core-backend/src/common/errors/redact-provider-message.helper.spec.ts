import { redactProviderMessage } from './redact-provider-message.helper';

describe('redactProviderMessage', () => {
  it('keeps a message that quotes nothing', () => {
    expect(
      redactProviderMessage('Malformed input request, please reformat'),
    ).toBe('Malformed input request, please reformat');
  });

  it('collapses whitespace', () => {
    expect(redactProviderMessage('400 Invalid\n\t request  shape')).toBe(
      '400 Invalid request shape',
    );
  });

  it.each([
    [
      'a quoted value with an apostrophe',
      "Invalid value: 'patient's record MRN-4451'. Supported values follow.",
      "Invalid value: '…",
    ],
    [
      'a quoted token that looks like an identifier',
      "Unknown value 'MRN-4451' for 'messages[3].role'",
      "Unknown value '…",
    ],
    [
      'a quoted parameter path',
      "Invalid 'input[2].content[0].type': expected a string",
      "Invalid '…",
    ],
    [
      'a double-quoted value',
      'Unsupported value "Anna.Muster.pdf" in input',
      'Unsupported value "…',
    ],
    [
      'a backtick-quoted value',
      'Unknown field `Sehr geehrte Frau`',
      'Unknown field `…',
    ],
    [
      'an embedded object',
      'Request failed {"message":"bad","input":"resident text"}',
      'Request failed {…',
    ],
    [
      'an embedded list',
      'Validation failed [{"msg":"bad","input":"resident text"}]',
      'Validation failed […',
    ],
  ])('cuts at %s', (_case, message, expected) => {
    expect(redactProviderMessage(message)).toBe(expected);
  });

  it('bounds long messages to 300 characters', () => {
    expect(redactProviderMessage(`400 ${'x'.repeat(400)}`)).toBe(
      `400 ${'x'.repeat(296)}…`,
    );
  });

  it('returns undefined for missing or blank input', () => {
    expect(redactProviderMessage(undefined)).toBeUndefined();
    expect(redactProviderMessage('  \n ')).toBeUndefined();
  });
});
