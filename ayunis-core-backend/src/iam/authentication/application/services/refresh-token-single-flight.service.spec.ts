import { RefreshTokenCommand } from 'src/iam/authentication/application/use-cases/refresh-token/refresh-token.command';
import type { RefreshTokenUseCase } from 'src/iam/authentication/application/use-cases/refresh-token/refresh-token.use-case';
import { AuthTokens } from 'src/iam/authentication/domain/auth-tokens.entity';
import { RefreshTokenSingleFlightService } from './refresh-token-single-flight.service';

describe('RefreshTokenSingleFlightService', () => {
  let refreshTokenUseCase: jest.Mocked<RefreshTokenUseCase>;
  let service: RefreshTokenSingleFlightService;

  beforeEach(() => {
    refreshTokenUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<RefreshTokenUseCase>;
    service = new RefreshTokenSingleFlightService(refreshTokenUseCase);
  });

  it('shares one refresh across concurrent calls with the same token and mode', async () => {
    let releaseRefresh: (tokens: AuthTokens) => void;
    const refreshResult = new Promise<AuthTokens>((resolve) => {
      releaseRefresh = resolve;
    });
    refreshTokenUseCase.execute.mockReturnValue(refreshResult);
    const command = new RefreshTokenCommand('shared-refresh-token');

    const refreshes = Array.from({ length: 4 }, () => service.execute(command));

    expect(refreshTokenUseCase.execute).toHaveBeenCalledTimes(1);
    releaseRefresh!(
      new AuthTokens('renewed-access-token', 'rotated-refresh-token'),
    );
    await expect(Promise.all(refreshes)).resolves.toEqual([
      expect.objectContaining({ refresh_token: 'rotated-refresh-token' }),
      expect.objectContaining({ refresh_token: 'rotated-refresh-token' }),
      expect.objectContaining({ refresh_token: 'rotated-refresh-token' }),
      expect.objectContaining({ refresh_token: 'rotated-refresh-token' }),
    ]);

    refreshTokenUseCase.execute.mockResolvedValueOnce(
      new AuthTokens('later-access-token', 'later-refresh-token'),
    );
    await expect(service.execute(command)).resolves.toEqual(
      expect.objectContaining({ refresh_token: 'later-refresh-token' }),
    );
    expect(refreshTokenUseCase.execute).toHaveBeenCalledTimes(2);
  });

  it('removes a failed flight so the same token can retry', async () => {
    const command = new RefreshTokenCommand('retryable-refresh-token');
    const outage = new Error('database unavailable');
    refreshTokenUseCase.execute.mockRejectedValueOnce(outage);

    await expect(
      Promise.all([service.execute(command), service.execute(command)]),
    ).rejects.toBe(outage);

    refreshTokenUseCase.execute.mockResolvedValueOnce(
      new AuthTokens('renewed-access-token', 'rotated-refresh-token'),
    );
    await expect(service.execute(command)).resolves.toEqual(
      expect.objectContaining({ refresh_token: 'rotated-refresh-token' }),
    );
    expect(refreshTokenUseCase.execute).toHaveBeenCalledTimes(2);
  });

  it('shares concurrent client-bound refreshes', async () => {
    refreshTokenUseCase.execute.mockResolvedValue(
      new AuthTokens('access-token', 'refresh-token'),
    );
    const command = new RefreshTokenCommand('outlook-refresh-token', true);

    await Promise.all([service.execute(command), service.execute(command)]);

    expect(refreshTokenUseCase.execute).toHaveBeenCalledTimes(1);
    expect(refreshTokenUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ clientBound: true }),
    );
  });

  it('refreshes different tokens independently', async () => {
    refreshTokenUseCase.execute.mockImplementation(async (command) =>
      Promise.resolve(
        new AuthTokens(
          `access-for-${command.refreshToken}`,
          `rotated-${command.refreshToken}`,
        ),
      ),
    );

    await Promise.all([
      service.execute(new RefreshTokenCommand('first-refresh-token')),
      service.execute(new RefreshTokenCommand('second-refresh-token')),
    ]);

    expect(refreshTokenUseCase.execute).toHaveBeenCalledTimes(2);
  });

  it('keeps cookie and client-bound refresh security checks independent', async () => {
    refreshTokenUseCase.execute.mockResolvedValue(
      new AuthTokens('access-token', 'refresh-token'),
    );

    await Promise.all([
      service.execute(new RefreshTokenCommand('same-token', false)),
      service.execute(new RefreshTokenCommand('same-token', true)),
    ]);

    expect(refreshTokenUseCase.execute).toHaveBeenCalledTimes(2);
    expect(refreshTokenUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ clientBound: false }),
    );
    expect(refreshTokenUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ clientBound: true }),
    );
  });
});
