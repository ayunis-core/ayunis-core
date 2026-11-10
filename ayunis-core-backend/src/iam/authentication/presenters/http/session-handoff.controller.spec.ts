import { BadRequestException, ValidationPipe } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import {
  HandoffOriginNotAllowedError,
  InvalidTokenError,
} from 'src/iam/authentication/application/authentication.errors';
import type { HandOffSessionUseCase } from 'src/iam/authentication/application/use-cases/hand-off-session/hand-off-session.use-case';
import { AuthTokens } from 'src/iam/authentication/domain/auth-tokens.entity';
import { SessionHandoffRequestDto } from 'src/iam/authentication/presenters/http/dtos/session-tokens.dto';
import { SessionTokensResponseDtoMapper } from 'src/iam/authentication/presenters/http/mappers/session-tokens-response-dto.mapper';
import { SessionHandoffController } from 'src/iam/authentication/presenters/http/session-handoff.controller';

describe(SessionHandoffController.name, () => {
  const handOffSessionUseCase = { execute: jest.fn() };
  const configService = {
    get: jest.fn((key: string, defaultValue?: unknown) =>
      key === 'app.frontend.baseUrl' ? 'http://localhost:3001' : defaultValue,
    ),
  } as unknown as ConfigService;
  const dialogRequest = (cookies: Record<string, string>, origin?: string) =>
    ({
      cookies,
      headers: origin === undefined ? {} : { origin },
    }) as unknown as Request;
  const controller = new SessionHandoffController(
    handOffSessionUseCase as unknown as HandOffSessionUseCase,
    configService,
    new SessionTokensResponseDtoMapper(configService),
  );
  beforeEach(() => jest.clearAllMocks());

  it('returns the client session tokens from the refresh cookie', async () => {
    handOffSessionUseCase.execute.mockResolvedValue(
      new AuthTokens('pane-access-jwt', 'pane-refresh-token'),
    );

    const result = await controller.handoff(
      dialogRequest(
        { refresh_token: 'dialog-refresh-token' },
        'http://localhost:3001',
      ),
      { client: 'outlook' },
    );

    expect(result).toEqual({
      accessToken: 'pane-access-jwt',
      refreshToken: 'pane-refresh-token',
      expiresIn: 3600,
    });
    expect(handOffSessionUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        refreshToken: 'dialog-refresh-token',
        client: 'outlook',
      }),
    );
  });

  it('issues nothing without a refresh cookie', async () => {
    await expect(
      controller.handoff(dialogRequest({}, 'http://localhost:3001'), {
        client: 'outlook',
      }),
    ).rejects.toBeInstanceOf(InvalidTokenError);
    expect(handOffSessionUseCase.execute).not.toHaveBeenCalled();
  });

  // The dialog always runs on the frontend origin. Any other origin is a
  // page that could read the tokens through permissive CORS.
  it.each([
    ['another origin', 'https://intranet.stadt.example'],
    ['no origin', undefined],
  ])('issues nothing to a request from %s', async (_label, origin) => {
    await expect(
      controller.handoff(
        dialogRequest({ refresh_token: 'dialog-refresh-token' }, origin),
        { client: 'outlook' },
      ),
    ).rejects.toBeInstanceOf(HandoffOriginNotAllowedError);
    expect(handOffSessionUseCase.execute).not.toHaveBeenCalled();
  });

  it('rejects a client outside the registry', async () => {
    await expect(
      new ValidationPipe().transform(
        { client: 'teams' },
        { type: 'body', metatype: SessionHandoffRequestDto },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
