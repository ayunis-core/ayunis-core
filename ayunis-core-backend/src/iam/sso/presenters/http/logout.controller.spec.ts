import type { ConfigService } from '@nestjs/config';
import { PATH_METADATA } from '@nestjs/common/constants';
import type { Request, Response } from 'express';
import { FEATURE_KEY } from 'src/common/guards/feature.guard';
import type { CompleteSsoLogoutUseCase } from 'src/iam/sso/application/use-cases/complete-sso-logout/complete-sso-logout.use-case';
import { LogoutController } from 'src/iam/sso/presenters/http/logout.controller';

describe(LogoutController.name, () => {
  const completeLogout = { execute: jest.fn() };
  const configService = {
    get: jest.fn().mockImplementation((_key, defaultValue) => defaultValue),
  };
  const response = {
    clearCookie: jest.fn(),
  } as unknown as Response;
  const controller = new LogoutController(
    completeLogout as unknown as CompleteSsoLogoutUseCase,
    configService as unknown as ConfigService,
  );

  beforeEach(() => jest.clearAllMocks());

  it('serves the feature-independent authentication logout route', () => {
    expect(Reflect.getMetadata(PATH_METADATA, LogoutController)).toBe('auth');
    expect(Reflect.getMetadata(PATH_METADATA, controller.logout)).toBe(
      'logout',
    );
    expect(Reflect.getMetadata(FEATURE_KEY, LogoutController)).toBeUndefined();
    expect(Reflect.getMetadata(FEATURE_KEY, controller.logout)).toBeUndefined();
  });

  it('clears Core cookies and returns the optional broker logout URL', async () => {
    completeLogout.execute.mockResolvedValue({
      brokerLogoutUrl: 'https://sso.ayunis.de/oidc/v1/end_session',
    });
    const request = {
      cookies: { refresh_token: 'refresh-token' },
    } as unknown as Request;

    await expect(controller.logout(request, response)).resolves.toEqual({
      success: true,
      brokerLogoutUrl: 'https://sso.ayunis.de/oidc/v1/end_session',
    });
    expect(completeLogout.execute).toHaveBeenCalledWith(
      expect.objectContaining({ refreshToken: 'refresh-token' }),
    );
    expect(response.clearCookie).toHaveBeenCalledWith(
      'refresh_token',
      expect.any(Object),
    );
  });

  it('clears Core cookies when logout completion fails', async () => {
    completeLogout.execute.mockRejectedValue(new Error('broker unavailable'));
    const request = {
      cookies: { refresh_token: 'refresh-token' },
    } as unknown as Request;

    await expect(controller.logout(request, response)).rejects.toThrow(
      'broker unavailable',
    );
    expect(response.clearCookie).toHaveBeenCalledWith(
      'refresh_token',
      expect.any(Object),
    );
  });
});
