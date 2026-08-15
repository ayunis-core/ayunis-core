import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ResendEmailConfirmationCommand } from './resend-email-confirmation.command';
import { UsersRepository } from '../../ports/users.repository';
import { ApplicationError } from 'src/common/errors/base.error';
import {
  UserEmailAlreadyVerifiedError,
  UserUnexpectedError,
} from '../../users.errors';
import { SendConfirmationEmailUseCase } from '../send-confirmation-email/send-confirmation-email.use-case';
import { SendConfirmationEmailCommand } from '../send-confirmation-email/send-confirmation-email.command';

@Injectable()
export class ResendEmailConfirmationUseCase {
  constructor(
    @InjectPinoLogger(ResendEmailConfirmationUseCase.name)
    private readonly logger: PinoLogger,
    private readonly usersRepository: UsersRepository,
    private readonly sendConfirmationEmailUseCase: SendConfirmationEmailUseCase,
  ) {}

  async execute(command: ResendEmailConfirmationCommand): Promise<void> {
    try {
      this.logger.info({ email: command.email }, 'execute');

      // Find the user by email
      const user = await this.usersRepository.findOneByEmail(command.email);
      if (!user) {
        this.logger.error({ email: command.email }, 'User not found');
        return; // Silently return without error for security reasons
      }

      await this.sendConfirmationEmailUseCase
        .execute(new SendConfirmationEmailCommand(user))
        .catch((error) => {
          if (error instanceof UserEmailAlreadyVerifiedError) return; // Silently return without error for security reasons
          this.logger.error(
            {
              error: error instanceof Error ? error.message : 'Unknown error',
            },
            'Error resending email confirmation',
          );
          throw new UserUnexpectedError(error as Error);
        });
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Error resending email confirmation',
      );
      throw new UserUnexpectedError(error as Error);
    }
  }
}
