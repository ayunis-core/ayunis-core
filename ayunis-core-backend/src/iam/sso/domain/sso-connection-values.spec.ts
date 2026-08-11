import {
  normalizeEmailDomain,
  normalizeZitadelOrgId,
} from 'src/iam/sso/domain/sso-connection-values';
import { InvalidSsoConnectionValueError } from 'src/iam/sso/domain/invalid-sso-connection-value.error';

describe('SSO connection values', () => {
  describe('normalizeEmailDomain', () => {
    it('trims and lowercases a valid domain', () => {
      expect(normalizeEmailDomain(' Stadt.Example ')).toBe('stadt.example');
    });

    it.each(['localhost', '-stadt.example', 'stadt..example', 'stadt_example'])(
      'rejects invalid domain %s',
      (domain) => {
        expect(() => normalizeEmailDomain(domain)).toThrow(
          InvalidSsoConnectionValueError,
        );
      },
    );
  });

  describe('normalizeZitadelOrgId', () => {
    it('trims a valid organization ID', () => {
      expect(normalizeZitadelOrgId(' zitadel-org-1 ')).toBe('zitadel-org-1');
    });

    it('rejects an empty organization ID', () => {
      expect(() => normalizeZitadelOrgId('   ')).toThrow(
        InvalidSsoConnectionValueError,
      );
    });

    it.each(['zitadel org', 'zitadel\norg', 'zitadel\u0000org'])(
      'rejects whitespace or control characters in %j',
      (value) => {
        expect(() => normalizeZitadelOrgId(value)).toThrow(
          InvalidSsoConnectionValueError,
        );
      },
    );
  });
});
