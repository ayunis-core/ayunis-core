import { randomUUID } from 'crypto';
import { McpIntegrationOAuthToken } from './mcp-integration-oauth-token.entity';

describe('McpIntegrationOAuthToken', () => {
  const integrationId = randomUUID();
  const userId = randomUUID();

  describe('construction', () => {
    it('should generate an id and timestamps when not provided', () => {
      const token = new McpIntegrationOAuthToken({
        integrationId,
        userId: null,
        accessTokenEncrypted: 'enc-access',
      });

      expect(token.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
      expect(token.createdAt).toBeInstanceOf(Date);
      expect(token.updatedAt).toBeInstanceOf(Date);
      expect(token.userId).toBeNull();
      expect(token.refreshTokenEncrypted).toBeUndefined();
      expect(token.tokenExpiresAt).toBeUndefined();
      expect(token.scope).toBeUndefined();
    });

    it('should preserve a provided id and store a per-user token', () => {
      const id = randomUUID();
      const expiresAt = new Date('2030-01-01T00:00:00Z');
      const token = new McpIntegrationOAuthToken({
        id,
        integrationId,
        userId,
        accessTokenEncrypted: 'enc-access',
        refreshTokenEncrypted: 'enc-refresh',
        tokenExpiresAt: expiresAt,
        scope: 'read:user write:repo',
      });

      expect(token.id).toBe(id);
      expect(token.integrationId).toBe(integrationId);
      expect(token.userId).toBe(userId);
      expect(token.accessTokenEncrypted).toBe('enc-access');
      expect(token.refreshTokenEncrypted).toBe('enc-refresh');
      expect(token.tokenExpiresAt).toEqual(expiresAt);
      // Defensive copy: not the same reference as the caller's Date
      expect(token.tokenExpiresAt).not.toBe(expiresAt);
      expect(token.scope).toBe('read:user write:repo');
    });
  });

  describe('isExpired', () => {
    it('should return false when there is no expiry', () => {
      const token = new McpIntegrationOAuthToken({
        integrationId,
        userId: null,
        accessTokenEncrypted: 'enc-access',
      });

      expect(token.isExpired(new Date('2030-01-01T00:00:00Z'))).toBe(false);
    });

    it('should return false when expiry is in the future', () => {
      const token = new McpIntegrationOAuthToken({
        integrationId,
        userId: null,
        accessTokenEncrypted: 'enc-access',
        tokenExpiresAt: new Date('2030-01-01T00:00:00Z'),
      });

      expect(token.isExpired(new Date('2025-06-01T00:00:00Z'))).toBe(false);
    });

    it('should return true when expiry is exactly now', () => {
      const at = new Date('2025-06-01T00:00:00Z');
      const token = new McpIntegrationOAuthToken({
        integrationId,
        userId: null,
        accessTokenEncrypted: 'enc-access',
        tokenExpiresAt: at,
      });

      expect(token.isExpired(at)).toBe(true);
    });

    it('should return true when expiry is in the past', () => {
      const token = new McpIntegrationOAuthToken({
        integrationId,
        userId: null,
        accessTokenEncrypted: 'enc-access',
        tokenExpiresAt: new Date('2020-01-01T00:00:00Z'),
      });

      expect(token.isExpired(new Date('2025-06-01T00:00:00Z'))).toBe(true);
    });

    it('should default to comparing against current time', () => {
      const token = new McpIntegrationOAuthToken({
        integrationId,
        userId: null,
        accessTokenEncrypted: 'enc-access',
        tokenExpiresAt: new Date(Date.now() - 1000),
      });

      expect(token.isExpired()).toBe(true);
    });
  });

  describe('updateTokens', () => {
    it('should replace all token fields and refresh updatedAt', () => {
      const token = new McpIntegrationOAuthToken({
        integrationId,
        userId,
        accessTokenEncrypted: 'enc-old-access',
        refreshTokenEncrypted: 'enc-old-refresh',
        tokenExpiresAt: new Date('2020-01-01T00:00:00Z'),
        scope: 'read:user',
      });

      const previousUpdatedAt = token.updatedAt;

      const newExpiry = new Date('2031-01-01T00:00:00Z');
      token.updateTokens({
        accessTokenEncrypted: 'enc-new-access',
        refreshTokenEncrypted: 'enc-new-refresh',
        tokenExpiresAt: newExpiry,
        scope: 'read:user write:repo',
      });

      expect(token.accessTokenEncrypted).toBe('enc-new-access');
      expect(token.refreshTokenEncrypted).toBe('enc-new-refresh');
      expect(token.tokenExpiresAt).toEqual(newExpiry);
      expect(token.scope).toBe('read:user write:repo');
      expect(token.updatedAt.getTime()).toBeGreaterThanOrEqual(
        previousUpdatedAt.getTime(),
      );
    });

    describe('preserve / clear / replace matrix', () => {
      const makeToken = () =>
        new McpIntegrationOAuthToken({
          integrationId,
          userId,
          accessTokenEncrypted: 'enc-old-access',
          refreshTokenEncrypted: 'enc-old-refresh',
          tokenExpiresAt: new Date('2025-01-01T00:00:00Z'),
          scope: 'read:user',
        });

      it('preserves refreshTokenEncrypted / tokenExpiresAt / scope when omitted (RFC 6749 §6 refresh semantics)', () => {
        const token = makeToken();
        const originalExpiry = token.tokenExpiresAt;

        token.updateTokens({ accessTokenEncrypted: 'enc-new-access' });

        expect(token.accessTokenEncrypted).toBe('enc-new-access');
        expect(token.refreshTokenEncrypted).toBe('enc-old-refresh');
        expect(token.tokenExpiresAt).toEqual(originalExpiry);
        expect(token.scope).toBe('read:user');
      });

      it('clears refreshTokenEncrypted when explicitly set to null', () => {
        const token = makeToken();

        token.updateTokens({
          accessTokenEncrypted: 'enc-new-access',
          refreshTokenEncrypted: null,
        });

        expect(token.refreshTokenEncrypted).toBeUndefined();
        // other fields preserved
        expect(token.tokenExpiresAt).toEqual(new Date('2025-01-01T00:00:00Z'));
        expect(token.scope).toBe('read:user');
      });

      it('clears tokenExpiresAt when explicitly set to null', () => {
        const token = makeToken();

        token.updateTokens({
          accessTokenEncrypted: 'enc-new-access',
          tokenExpiresAt: null,
        });

        expect(token.tokenExpiresAt).toBeUndefined();
        expect(token.refreshTokenEncrypted).toBe('enc-old-refresh');
        expect(token.scope).toBe('read:user');
      });

      it('clears scope when explicitly set to null', () => {
        const token = makeToken();

        token.updateTokens({
          accessTokenEncrypted: 'enc-new-access',
          scope: null,
        });

        expect(token.scope).toBeUndefined();
        expect(token.refreshTokenEncrypted).toBe('enc-old-refresh');
        expect(token.tokenExpiresAt).toEqual(new Date('2025-01-01T00:00:00Z'));
      });

      it('replaces refreshTokenEncrypted / tokenExpiresAt / scope with concrete values', () => {
        const token = makeToken();
        const newExpiry = new Date('2099-12-31T23:59:59Z');

        token.updateTokens({
          accessTokenEncrypted: 'enc-new-access',
          refreshTokenEncrypted: 'enc-new-refresh',
          tokenExpiresAt: newExpiry,
          scope: 'read:user write:repo',
        });

        expect(token.refreshTokenEncrypted).toBe('enc-new-refresh');
        expect(token.tokenExpiresAt).toEqual(newExpiry);
        expect(token.scope).toBe('read:user write:repo');
      });
    });
  });

  describe('defensive copying of tokenExpiresAt', () => {
    it('should copy tokenExpiresAt at construction time so later mutations do not leak in', () => {
      const expiresAt = new Date('2030-01-01T00:00:00Z');
      const token = new McpIntegrationOAuthToken({
        integrationId,
        userId: null,
        accessTokenEncrypted: 'enc-access',
        tokenExpiresAt: expiresAt,
      });

      expiresAt.setFullYear(1999);

      expect(token.tokenExpiresAt?.getUTCFullYear()).toBe(2030);
    });

    it('should copy tokenExpiresAt in updateTokens so later mutations do not leak in', () => {
      const token = new McpIntegrationOAuthToken({
        integrationId,
        userId: null,
        accessTokenEncrypted: 'enc-access',
      });

      const newExpiry = new Date('2030-01-01T00:00:00Z');
      token.updateTokens({
        accessTokenEncrypted: 'enc-new',
        tokenExpiresAt: newExpiry,
      });

      newExpiry.setFullYear(1999);

      expect(token.tokenExpiresAt?.getUTCFullYear()).toBe(2030);
    });

    it('should return a fresh tokenExpiresAt Date so caller mutations do not leak into internal state', () => {
      const token = new McpIntegrationOAuthToken({
        integrationId,
        userId: null,
        accessTokenEncrypted: 'enc-access',
        tokenExpiresAt: new Date('2030-01-01T00:00:00Z'),
      });

      const leaked = token.tokenExpiresAt;
      expect(leaked).toBeDefined();
      leaked!.setFullYear(1999);

      expect(token.tokenExpiresAt?.getUTCFullYear()).toBe(2030);
    });
  });

  describe('field encapsulation', () => {
    it('should expose token fields via read-only getters that return the constructed values', () => {
      const expiresAt = new Date('2030-01-01T00:00:00Z');
      const token = new McpIntegrationOAuthToken({
        integrationId,
        userId,
        accessTokenEncrypted: 'enc-access',
        refreshTokenEncrypted: 'enc-refresh',
        tokenExpiresAt: expiresAt,
        scope: 'read:user',
      });

      expect(token.accessTokenEncrypted).toBe('enc-access');
      expect(token.refreshTokenEncrypted).toBe('enc-refresh');
      expect(token.tokenExpiresAt).toEqual(expiresAt);
      expect(token.scope).toBe('read:user');
    });
  });
});
