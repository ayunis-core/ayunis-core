import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { CreateSessionCommand } from './create-session.command';
import { RefreshTokensRepository } from '../../ports/refresh-tokens.repository';
import { RefreshTokenFactory } from '../../services/refresh-token.factory';
import { UnexpectedSessionsError } from '../../sessions.errors';

export interface CreateSessionResult {
  refreshToken: string;
  expiresAt: Date;
}

@Injectable()
export class CreateSessionUseCase {
  private readonly logger = new Logger(CreateSessionUseCase.name);

  constructor(
    private readonly refreshTokensRepository: RefreshTokensRepository,
    private readonly refreshTokenFactory: RefreshTokenFactory,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSessionsError)
  async execute(command: CreateSessionCommand): Promise<CreateSessionResult> {
    this.logger.log('createSession', { userId: command.userId });

    const { token, plaintext } = this.refreshTokenFactory.create({
      userId: command.userId,
      familyId: this.refreshTokenFactory.newFamilyId(),
    });

    await this.refreshTokensRepository.insert(token);

    return { refreshToken: plaintext, expiresAt: token.expiresAt };
  }
}
