import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { GetMcpOAuthAuthorizationStatusUseCase } from './get-mcp-oauth-authorization-status.use-case';
import { GetMcpOAuthAuthorizationStatusQuery } from './get-mcp-oauth-authorization-status.query';
import { OAuthFlowService } from '../../services/oauth-flow.service';
import { SelfDefinedMcpIntegration } from '../../../domain/integrations/self-defined-mcp-integration.entity';
import { NoAuthMcpIntegrationAuth } from '../../../domain/auth/no-auth-mcp-integration-auth.entity';
import type { IntegrationConfigSchema } from '../../../domain/value-objects/integration-config-schema';
import { McpUnauthenticatedError } from '../../mcp.errors';

describe('GetMcpOAuthAuthorizationStatusUseCase', () => {
  let useCase: GetMcpOAuthAuthorizationStatusUseCase;
  let oauthFlowService: OAuthFlowService;

  const mockOrgId = randomUUID();
  const mockUserId = randomUUID();

  const oauthConfigSchema: IntegrationConfigSchema = {
    authType: 'OAUTH',
    orgFields: [],
    userFields: [],
    oauth: {
      authorizationUrl: 'https://auth.example.com/authorize',
      tokenUrl: 'https://auth.example.com/token',
      scopes: ['read'],
      level: 'org',
    },
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetMcpOAuthAuthorizationStatusUseCase,
        {
          provide: OAuthFlowService,
          useValue: {
            getStatus: jest.fn(),
            resolveOAuthActor: jest.fn(),
          },
        },
      ],
    }).compile();

    useCase = module.get(GetMcpOAuthAuthorizationStatusUseCase);
    oauthFlowService = module.get(OAuthFlowService);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return status with level for an org-level OAuth integration', async () => {
    const integration = new SelfDefinedMcpIntegration({
      orgId: mockOrgId,
      name: 'Test',
      serverUrl: 'https://mcp.example.com',
      configSchema: oauthConfigSchema,
      orgConfigValues: {},
      auth: new NoAuthMcpIntegrationAuth(),
      oauthClientId: 'cid',
      oauthClientSecretEncrypted: 'enc',
    });

    jest.spyOn(oauthFlowService, 'resolveOAuthActor').mockResolvedValue({
      integration,
      level: 'org',
      orgId: mockOrgId,
      userIdOrNull: null,
    });
    jest.spyOn(oauthFlowService, 'getStatus').mockResolvedValue({
      authorized: true,
      expiresAt: new Date('2026-01-01'),
      scope: 'read',
    });

    const result = await useCase.execute(
      new GetMcpOAuthAuthorizationStatusQuery(integration.id),
    );

    expect(result).toEqual({
      level: 'org',
      authorized: true,
      expiresAt: new Date('2026-01-01'),
      scope: 'read',
    });

    expect(oauthFlowService.getStatus).toHaveBeenCalledWith(
      integration.id,
      null,
    );
  });

  it('should use userId for user-level OAuth', async () => {
    const userLevelSchema: IntegrationConfigSchema = {
      ...oauthConfigSchema,
      oauth: { ...oauthConfigSchema.oauth!, level: 'user' },
    };
    const integration = new SelfDefinedMcpIntegration({
      orgId: mockOrgId,
      name: 'Test',
      serverUrl: 'https://mcp.example.com',
      configSchema: userLevelSchema,
      orgConfigValues: {},
      auth: new NoAuthMcpIntegrationAuth(),
      oauthClientId: 'cid',
      oauthClientSecretEncrypted: 'enc',
    });

    jest.spyOn(oauthFlowService, 'resolveOAuthActor').mockResolvedValue({
      integration,
      level: 'user',
      orgId: mockOrgId,
      userIdOrNull: mockUserId,
    });
    jest.spyOn(oauthFlowService, 'getStatus').mockResolvedValue({
      authorized: false,
      expiresAt: null,
      scope: null,
    });

    const result = await useCase.execute(
      new GetMcpOAuthAuthorizationStatusQuery(integration.id),
    );

    expect(result.level).toBe('user');
    expect(oauthFlowService.getStatus).toHaveBeenCalledWith(
      integration.id,
      mockUserId,
    );
  });

  it('should throw McpUnauthenticatedError when orgId missing', async () => {
    jest
      .spyOn(oauthFlowService, 'resolveOAuthActor')
      .mockRejectedValue(new McpUnauthenticatedError());

    await expect(
      useCase.execute(new GetMcpOAuthAuthorizationStatusQuery(randomUUID())),
    ).rejects.toThrow(McpUnauthenticatedError);
  });
});
