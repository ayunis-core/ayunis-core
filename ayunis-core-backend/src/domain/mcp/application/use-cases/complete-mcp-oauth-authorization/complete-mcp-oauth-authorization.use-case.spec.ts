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
          useValue: { handleCallback: jest.fn() },
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
    jest.spyOn(oauthFlowService, 'handleCallback').mockResolvedValue({
      integrationId,
      level: 'org',
      userId: null,
    });

    const result = await useCase.execute(
      new CompleteMcpOAuthAuthorizationCommand('auth-code', 'state-jwt'),
    );

    expect(result).toEqual({ integrationId, success: true });
  });

  it('should return failure on exchange error', async () => {
    jest
      .spyOn(oauthFlowService, 'handleCallback')
      .mockRejectedValue(
        new McpOAuthExchangeFailedError('token endpoint error'),
      );

    const result = await useCase.execute(
      new CompleteMcpOAuthAuthorizationCommand('code', 'state'),
    );

    expect(result.success).toBe(false);
    expect(result.reason).toContain('token endpoint error');
  });

  it('should return failure on invalid state', async () => {
    jest
      .spyOn(oauthFlowService, 'handleCallback')
      .mockRejectedValue(new McpOAuthStateInvalidError());

    const result = await useCase.execute(
      new CompleteMcpOAuthAuthorizationCommand('code', 'bad-state'),
    );

    expect(result.success).toBe(false);
    expect(result.reason).toBeDefined();
  });
});
