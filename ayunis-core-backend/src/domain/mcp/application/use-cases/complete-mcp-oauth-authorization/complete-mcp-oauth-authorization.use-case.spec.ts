import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { CompleteMcpOAuthAuthorizationUseCase } from './complete-mcp-oauth-authorization.use-case';
import { CompleteMcpOAuthAuthorizationCommand } from './complete-mcp-oauth-authorization.command';
import { OAuthFlowService } from '../../services/oauth-flow.service';
import {
  McpOAuthExchangeFailedError,
  McpOAuthStateInvalidError,
} from '../../mcp.errors';

describe('CompleteMcpOAuthAuthorizationUseCase', () => {
  let useCase: CompleteMcpOAuthAuthorizationUseCase;
  let oauthFlowService: OAuthFlowService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompleteMcpOAuthAuthorizationUseCase,
        {
          provide: OAuthFlowService,
          useValue: {
            handleCallback: jest.fn(),
            resolveAuthorizationContext: jest.fn(),
          },
        },
      ],
    }).compile();

    useCase = module.get(CompleteMcpOAuthAuthorizationUseCase);
    oauthFlowService = module.get(OAuthFlowService);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return success when callback completes', async () => {
    const integrationId = randomUUID();
    jest
      .spyOn(oauthFlowService, 'resolveAuthorizationContext')
      .mockReturnValue({
        level: 'user',
        frontendRedirectPath: '/settings/integrations',
      });
    jest.spyOn(oauthFlowService, 'handleCallback').mockResolvedValue({
      integrationId,
      level: 'user',
      userId: null,
      frontendRedirectPath: '/settings/integrations',
    });

    const result = await useCase.execute(
      new CompleteMcpOAuthAuthorizationCommand('auth-code', 'state-jwt'),
    );

    expect(result).toEqual({
      success: true,
      integrationId,
      frontendRedirectPath: '/settings/integrations',
      level: 'user',
    });
  });

  it('should return failure on exchange error', async () => {
    jest
      .spyOn(oauthFlowService, 'resolveAuthorizationContext')
      .mockReturnValue({
        level: 'org',
        frontendRedirectPath: '/agents/agent-123',
      });
    jest
      .spyOn(oauthFlowService, 'handleCallback')
      .mockRejectedValue(
        new McpOAuthExchangeFailedError('token endpoint error'),
      );

    const result = await useCase.execute(
      new CompleteMcpOAuthAuthorizationCommand('code', 'state'),
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.reason).toContain('token endpoint error');
      expect(result.frontendRedirectPath).toBe('/agents/agent-123');
      expect(result.level).toBe('org');
    }
  });

  it('should return failure on invalid state', async () => {
    jest
      .spyOn(oauthFlowService, 'resolveAuthorizationContext')
      .mockReturnValue(null);
    jest
      .spyOn(oauthFlowService, 'handleCallback')
      .mockRejectedValue(new McpOAuthStateInvalidError());

    const result = await useCase.execute(
      new CompleteMcpOAuthAuthorizationCommand('code', 'bad-state'),
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.reason).toBeDefined();
      expect(result.frontendRedirectPath).toBeNull();
      expect(result.level).toBeNull();
    }
  });
});
