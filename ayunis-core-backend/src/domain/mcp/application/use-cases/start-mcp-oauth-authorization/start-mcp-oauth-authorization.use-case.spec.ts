import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { StartMcpOAuthAuthorizationUseCase } from './start-mcp-oauth-authorization.use-case';
import { StartMcpOAuthAuthorizationCommand } from './start-mcp-oauth-authorization.command';
import { OAuthFlowService } from '../../services/oauth-flow.service';
import { SelfDefinedMcpIntegration } from '../../../domain/integrations/self-defined-mcp-integration.entity';
import { NoAuthMcpIntegrationAuth } from '../../../domain/auth/no-auth-mcp-integration-auth.entity';
import type { IntegrationConfigSchema } from '../../../domain/value-objects/integration-config-schema';
import {
  McpInvalidConfigSchemaError,
  McpUnauthenticatedError,
} from '../../mcp.errors';

describe('StartMcpOAuthAuthorizationUseCase', () => {
  let useCase: StartMcpOAuthAuthorizationUseCase;
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

  function buildIntegration(
    configSchema: IntegrationConfigSchema = oauthConfigSchema,
  ): SelfDefinedMcpIntegration {
    return new SelfDefinedMcpIntegration({
      orgId: mockOrgId,
      name: 'Test',
      serverUrl: 'https://mcp.example.com',
      configSchema,
      orgConfigValues: {},
      auth: new NoAuthMcpIntegrationAuth(),
      oauthClientId: 'cid',
      oauthClientSecretEncrypted: 'enc-secret',
    });
  }

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StartMcpOAuthAuthorizationUseCase,
        {
          provide: OAuthFlowService,
          useValue: {
            buildAuthorizationUrl: jest.fn(),
            resolveOAuthActor: jest.fn(),
          },
        },
      ],
    }).compile();

    useCase = module.get(StartMcpOAuthAuthorizationUseCase);
    oauthFlowService = module.get(OAuthFlowService);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return the authorization URL for org-level OAuth', async () => {
    const integration = buildIntegration();
    jest.spyOn(oauthFlowService, 'resolveOAuthActor').mockResolvedValue({
      integration,
      level: 'org',
      orgId: mockOrgId,
      userIdOrNull: null,
    });
    jest
      .spyOn(oauthFlowService, 'buildAuthorizationUrl')
      .mockReturnValue({ url: 'https://auth.example.com/authorize?...' });

    const result = await useCase.execute(
      new StartMcpOAuthAuthorizationCommand(integration.id),
    );

    expect(result.authorizationUrl).toBe(
      'https://auth.example.com/authorize?...',
    );
    expect(oauthFlowService.buildAuthorizationUrl).toHaveBeenCalledWith(
      integration,
      'org',
      mockOrgId,
      null,
    );
  });

  it('should pass userId for user-level OAuth', async () => {
    const userLevelSchema: IntegrationConfigSchema = {
      ...oauthConfigSchema,
      oauth: { ...oauthConfigSchema.oauth!, level: 'user' },
    };
    const integration = buildIntegration(userLevelSchema);

    jest.spyOn(oauthFlowService, 'resolveOAuthActor').mockResolvedValue({
      integration,
      level: 'user',
      orgId: mockOrgId,
      userIdOrNull: mockUserId,
    });
    jest
      .spyOn(oauthFlowService, 'buildAuthorizationUrl')
      .mockReturnValue({ url: 'https://auth.example.com/auth' });

    await useCase.execute(
      new StartMcpOAuthAuthorizationCommand(integration.id),
    );

    expect(oauthFlowService.buildAuthorizationUrl).toHaveBeenCalledWith(
      integration,
      'user',
      mockOrgId,
      mockUserId,
    );
  });

  it('should throw McpUnauthenticatedError for user-level OAuth when userId is missing', async () => {
    jest
      .spyOn(oauthFlowService, 'resolveOAuthActor')
      .mockRejectedValue(new McpUnauthenticatedError());

    await expect(
      useCase.execute(new StartMcpOAuthAuthorizationCommand(randomUUID())),
    ).rejects.toThrow(McpUnauthenticatedError);
  });

  it('should throw McpUnauthenticatedError when orgId is missing', async () => {
    jest
      .spyOn(oauthFlowService, 'resolveOAuthActor')
      .mockRejectedValue(new McpUnauthenticatedError());

    await expect(
      useCase.execute(new StartMcpOAuthAuthorizationCommand(randomUUID())),
    ).rejects.toThrow(McpUnauthenticatedError);
  });

  it('should propagate error when resolveOAuthActor throws', async () => {
    jest
      .spyOn(oauthFlowService, 'resolveOAuthActor')
      .mockRejectedValue(
        new McpInvalidConfigSchemaError(
          'Integration does not have OAuth configured',
        ),
      );

    await expect(
      useCase.execute(new StartMcpOAuthAuthorizationCommand(randomUUID())),
    ).rejects.toThrow(McpInvalidConfigSchemaError);
  });
});
