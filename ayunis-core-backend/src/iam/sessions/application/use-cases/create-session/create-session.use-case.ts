import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { CreateSessionCommand } from 'src/iam/sessions/application/use-cases/create-session/create-session.command';
import { RefreshTokensRepository } from 'src/iam/sessions/application/ports/refresh-tokens.repository';
import { RefreshTokenFactory } from 'src/iam/sessions/application/services/refresh-token.factory';
import { UnexpectedSessionsError } from 'src/iam/sessions/application/sessions.errors';

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
    this.logger.log({ userId: command.userId }, 'createSession');

    const { token, plaintext } = this.refreshTokenFactory.create({
      userId: command.userId,
      familyId: this.refreshTokenFactory.newFamilyId(),
      authenticationMethod: command.authenticationMethod,
      zitadelSessionId: command.zitadelSessionId,
    });

    await this.refreshTokensRepository.insert(token);

    return { refreshToken: plaintext, expiresAt: token.expiresAt };
  }
}
