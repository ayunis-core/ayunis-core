import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { StartMcpOAuthAuthorizationUseCase } from './start-mcp-oauth-authorization.use-case';
import { StartMcpOAuthAuthorizationCommand } from './start-mcp-oauth-authorization.command';
import { OAuthFlowService } from '../../services/oauth-flow.service';
import { ValidateIntegrationAccessService } from '../../services/validate-integration-access.service';
import { ContextService } from 'src/common/context/services/context.service';
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
  let validateAccess: ValidateIntegrationAccessService;
  let contextService: ContextService;

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
          useValue: { buildAuthorizationUrl: jest.fn() },
        },
        {
          provide: ValidateIntegrationAccessService,
          useValue: { validate: jest.fn() },
        },
        {
          provide: ContextService,
          useValue: { get: jest.fn() },
        },
      ],
    }).compile();

    useCase = module.get(StartMcpOAuthAuthorizationUseCase);
    oauthFlowService = module.get(OAuthFlowService);
    validateAccess = module.get(ValidateIntegrationAccessService);
    contextService = module.get(ContextService);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return the authorization URL for org-level OAuth', async () => {
    const integration = buildIntegration();
    jest
      .spyOn(contextService, 'get')
      .mockImplementation((key) => (key === 'orgId' ? mockOrgId : mockUserId));
    jest.spyOn(validateAccess, 'validate').mockResolvedValue(integration);
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
      null, // org-level → null userId
    );
  });

  it('should pass userId for user-level OAuth', async () => {
    const userLevelSchema: IntegrationConfigSchema = {
      ...oauthConfigSchema,
      oauth: { ...oauthConfigSchema.oauth!, level: 'user' },
    };
    const integration = buildIntegration(userLevelSchema);

    jest
      .spyOn(contextService, 'get')
      .mockImplementation((key) => (key === 'orgId' ? mockOrgId : mockUserId));
    jest.spyOn(validateAccess, 'validate').mockResolvedValue(integration);
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

  it('should throw McpUnauthenticatedError when orgId is missing', async () => {
    jest.spyOn(contextService, 'get').mockReturnValue(undefined);

    await expect(
      useCase.execute(new StartMcpOAuthAuthorizationCommand(randomUUID())),
    ).rejects.toThrow(McpUnauthenticatedError);
  });

  it('should throw McpInvalidConfigSchemaError when OAuth is not configured', async () => {
    const noOauthSchema: IntegrationConfigSchema = {
      authType: 'NONE',
      orgFields: [],
      userFields: [],
    };
    const integration = buildIntegration(noOauthSchema);

    jest
      .spyOn(contextService, 'get')
      .mockImplementation((key) => (key === 'orgId' ? mockOrgId : mockUserId));
    jest.spyOn(validateAccess, 'validate').mockResolvedValue(integration);

    await expect(
      useCase.execute(new StartMcpOAuthAuthorizationCommand(integration.id)),
    ).rejects.toThrow(McpInvalidConfigSchemaError);
  });
});
