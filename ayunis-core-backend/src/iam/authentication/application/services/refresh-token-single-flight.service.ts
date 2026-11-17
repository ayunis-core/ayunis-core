import { Injectable } from '@nestjs/common';
import { RefreshTokenCommand } from 'src/iam/authentication/application/use-cases/refresh-token/refresh-token.command';
import { RefreshTokenUseCase } from 'src/iam/authentication/application/use-cases/refresh-token/refresh-token.use-case';
import type { AuthTokens } from 'src/iam/authentication/domain/auth-tokens.entity';

@Injectable()
export class RefreshTokenSingleFlightService {
  private readonly inFlightRefreshes = new Map<string, Promise<AuthTokens>>();

  constructor(private readonly refreshTokenUseCase: RefreshTokenUseCase) {}

  execute(command: RefreshTokenCommand): Promise<AuthTokens> {
    const key = this.keyFor(command);
    const inFlight = this.inFlightRefreshes.get(key);
    if (inFlight) return inFlight;

    const refresh = this.executeRefresh(key, command);
    this.inFlightRefreshes.set(key, refresh);
    return refresh;
  }

  private keyFor(command: RefreshTokenCommand): string {
    return `${command.clientBound ? 'client' : 'cookie'}:${command.refreshToken}`;
  }

  private async executeRefresh(
    key: string,
    command: RefreshTokenCommand,
  ): Promise<AuthTokens> {
    try {
      return await this.refreshTokenUseCase.execute(command);
    } finally {
      this.inFlightRefreshes.delete(key);
    }
  }
}
