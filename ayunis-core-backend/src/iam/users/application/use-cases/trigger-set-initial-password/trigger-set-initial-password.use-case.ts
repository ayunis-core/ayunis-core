import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { TriggerSetInitialPasswordCommand } from './trigger-set-initial-password.command';
import { ApplicationError } from 'src/common/errors/base.error';
import { UnexpectedAuthenticationError } from 'src/iam/authentication/application/authentication.errors';
import { SendSetInitialPasswordEmailUseCase } from '../send-set-initial-password-email/send-set-initial-password-email.use-case';
import { SendSetInitialPasswordEmailCommand } from '../send-set-initial-password-email/send-set-initial-password-email.command';
import { PasswordSetTokenService } from '../../services/password-set-token.service';
import { PasswordSetTokenPurpose } from 'src/iam/users/domain/value-objects/password-set-token-purpose.enum';
import { UserNotFoundError } from '../../users.errors';
import { UsersRepository } from '../../ports/users.repository';

@Injectable()
export class TriggerSetInitialPasswordUseCase {
  constructor(
    @InjectPinoLogger(TriggerSetInitialPasswordUseCase.name)
    private readonly logger: PinoLogger,
    private readonly sendSetInitialPasswordEmailUseCase: SendSetInitialPasswordEmailUseCase,
    private readonly passwordSetTokenService: PasswordSetTokenService,
    private readonly usersRepository: UsersRepository,
  ) {}

  async execute(command: TriggerSetInitialPasswordCommand): Promise<void> {
    try {
      this.logger.info({ email: command.email }, 'execute');

      const user = await this.usersRepository.findOneByEmail(command.email);
      if (!user) {
        this.logger.debug({ email: command.email }, 'User not found');
        return;
      }

      const resetToken = await this.passwordSetTokenService.issue({
        userId: user.id,
        purpose: PasswordSetTokenPurpose.INITIAL,
      });

      await this.sendSetInitialPasswordEmailUseCase.execute(
        new SendSetInitialPasswordEmailCommand(
          user.email,
          user.name,
          resetToken,
          command.orgId,
        ),
      );

      this.logger.debug(
        {
          userId: user.id,
          email: user.email,
        },
        'Set-initial-password email triggered',
      );
    } catch (error) {
      if (error instanceof UserNotFoundError) return;
      if (error instanceof ApplicationError) throw error;
      this.logger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          email: command.email,
        },
        'Error triggering set-initial-password',
      );
      throw new UnexpectedAuthenticationError(error);
    }
  }
}
