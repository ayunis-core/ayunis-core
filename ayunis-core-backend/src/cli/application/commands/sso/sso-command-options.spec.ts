import {
  parseBooleanOption,
  parseOrgIdOption,
} from 'src/cli/application/commands/sso/sso-command-options';

describe('SSO command options', () => {
  it.each([
    ['true', true],
    ['TRUE', true],
    ['false', false],
    ['False', false],
  ] as const)('parses %s as %s', (value, expected) => {
    expect(parseBooleanOption(value)).toBe(expected);
  });

  it('rejects an ambiguous boolean value', () => {
    expect(() => parseBooleanOption('yes')).toThrow(
      'Expected either true or false',
    );
  });

  it('parses a UUID organization ID', () => {
    expect(parseOrgIdOption('11111111-1111-4111-8111-111111111111')).toBe(
      '11111111-1111-4111-8111-111111111111',
    );
  });

  it('canonicalizes an uppercase organization UUID', () => {
    expect(parseOrgIdOption('AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA')).toBe(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    );
  });

  it('rejects a malformed organization ID', () => {
    expect(() => parseOrgIdOption('not-a-uuid')).toThrow(
      'Expected a valid organization UUID',
    );
  });
});
