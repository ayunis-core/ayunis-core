import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { RevokeMcpOAuthAuthorizationUseCase } from './revoke-mcp-oauth-authorization.use-case';
import { RevokeMcpOAuthAuthorizationCommand } from './revoke-mcp-oauth-authorization.command';
import { OAuthFlowService } from '../../services/oauth-flow.service';
import { ValidateIntegrationAccessService } from '../../services/validate-integration-access.service';
import { ContextService } from 'src/common/context/services/context.service';
import { SelfDefinedMcpIntegration } from '../../../domain/integrations/self-defined-mcp-integration.entity';
import { NoAuthMcpIntegrationAuth } from '../../../domain/auth/no-auth-mcp-integration-auth.entity';
import type { IntegrationConfigSchema } from '../../../domain/value-objects/integration-config-schema';
import { McpUnauthenticatedError } from '../../mcp.errors';

describe('RevokeMcpOAuthAuthorizationUseCase', () => {
  let useCase: RevokeMcpOAuthAuthorizationUseCase;
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

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RevokeMcpOAuthAuthorizationUseCase,
        {
          provide: OAuthFlowService,
          useValue: { revoke: jest.fn(), resolveOAuthConfig: jest.fn() },
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

    useCase = module.get(RevokeMcpOAuthAuthorizationUseCase);
    oauthFlowService = module.get(OAuthFlowService);
    validateAccess = module.get(ValidateIntegrationAccessService);
    contextService = module.get(ContextService);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should revoke org-level OAuth token', async () => {
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

    jest
      .spyOn(contextService, 'get')
      .mockImplementation((key) => (key === 'orgId' ? mockOrgId : mockUserId));
    jest.spyOn(validateAccess, 'validate').mockResolvedValue(integration);
    jest
      .spyOn(oauthFlowService, 'resolveOAuthConfig')
      .mockReturnValue({ config: oauthConfigSchema.oauth!, level: 'org' });
    jest.spyOn(oauthFlowService, 'revoke').mockResolvedValue(undefined);

    await useCase.execute(
      new RevokeMcpOAuthAuthorizationCommand(integration.id),
    );

    expect(oauthFlowService.revoke).toHaveBeenCalledWith(
      integration.id,
      null, // org-level
    );
  });

  it('should throw McpUnauthenticatedError when orgId missing', async () => {
    jest.spyOn(contextService, 'get').mockReturnValue(undefined);

    await expect(
      useCase.execute(new RevokeMcpOAuthAuthorizationCommand(randomUUID())),
    ).rejects.toThrow(McpUnauthenticatedError);
  });
});
