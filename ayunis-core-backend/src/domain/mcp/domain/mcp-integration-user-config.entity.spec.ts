import { randomUUID } from 'crypto';
import { McpIntegrationUserConfig } from './mcp-integration-user-config.entity';

describe('McpIntegrationUserConfig', () => {
  const integrationId = randomUUID();
  const userId = randomUUID();

  it('should create with provided values', () => {
    const config = new McpIntegrationUserConfig({
      integrationId,
      userId,
      configValues: { personalToken: 'encrypted-personal-token' },
    });

    expect(config.id).toBeDefined();
    expect(config.integrationId).toBe(integrationId);
    expect(config.userId).toBe(userId);
    expect(config.configValues).toEqual({
      personalToken: 'encrypted-personal-token',
    });
    expect(config.createdAt).toBeInstanceOf(Date);
    expect(config.updatedAt).toBeInstanceOf(Date);
  });

  it('should restore from persisted state with explicit id and dates', () => {
    const id = randomUUID();
    const createdAt = new Date('2025-06-01T00:00:00.000Z');
    const updatedAt = new Date('2025-06-15T00:00:00.000Z');

    const config = new McpIntegrationUserConfig({
      id,
      integrationId,
      userId,
      configValues: { token: 'value' },
      createdAt,
      updatedAt,
    });

    expect(config.id).toBe(id);
    expect(config.createdAt).toBe(createdAt);
    expect(config.updatedAt).toBe(updatedAt);
  });

  it('should update config values and refresh updatedAt', () => {
    const config = new McpIntegrationUserConfig({
      integrationId,
      userId,
      configValues: { personalToken: 'old-token' },
    });

    const previousUpdatedAt = config.updatedAt;

    config.updateConfigValues({ personalToken: 'new-encrypted-token' });

    expect(config.configValues).toEqual({
      personalToken: 'new-encrypted-token',
    });
    expect(config.updatedAt.getTime()).toBeGreaterThanOrEqual(
      previousUpdatedAt.getTime(),
    );
  });

  it('should return value for a specific config key', () => {
    const config = new McpIntegrationUserConfig({
      integrationId,
      userId,
      configValues: {
        personalToken: 'encrypted-token',
        otherSetting: 'some-value',
      },
    });

    expect(config.getConfigValue('personalToken')).toBe('encrypted-token');
    expect(config.getConfigValue('otherSetting')).toBe('some-value');
    expect(config.getConfigValue('nonexistent')).toBeUndefined();
  });

  it('should return a defensive copy of config values', () => {
    const config = new McpIntegrationUserConfig({
      integrationId,
      userId,
      configValues: { personalToken: 'encrypted-token' },
    });

    const values = config.configValues;
    values['injected'] = 'hacked';

    expect(config.configValues).toEqual({
      personalToken: 'encrypted-token',
    });
  });
});
