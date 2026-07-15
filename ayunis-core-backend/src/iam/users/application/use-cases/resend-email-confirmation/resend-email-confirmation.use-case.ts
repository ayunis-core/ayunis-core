import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { Injectable, Logger } from '@nestjs/common';
import { ResendEmailConfirmationCommand } from './resend-email-confirmation.command';
import { UsersRepository } from '../../ports/users.repository';
import {
  UserEmailAlreadyVerifiedError,
  UserUnexpectedError,
} from '../../users.errors';
import { SendConfirmationEmailUseCase } from '../send-confirmation-email/send-confirmation-email.use-case';
import { SendConfirmationEmailCommand } from '../send-confirmation-email/send-confirmation-email.command';

@Injectable()
export class ResendEmailConfirmationUseCase {
  private readonly logger = new Logger(ResendEmailConfirmationUseCase.name);

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly sendConfirmationEmailUseCase: SendConfirmationEmailUseCase,
  ) {}

  @HandleUnexpectedErrors(UserUnexpectedError)
  async execute(command: ResendEmailConfirmationCommand): Promise<void> {
    this.logger.log('execute', { email: command.email });

    // Find the user by email
    const user = await this.usersRepository.findOneByEmail(command.email);
    if (!user) {
      this.logger.error('User not found', { email: command.email });
      return; // Silently return without error for security reasons
    }

    await this.sendConfirmationEmailUseCase
      .execute(new SendConfirmationEmailCommand(user))
      .catch((error) => {
        if (error instanceof UserEmailAlreadyVerifiedError) return; // Silently return without error for security reasons
        this.logger.error('Error resending email confirmation', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw new UserUnexpectedError(error as Error);
      });
  }
}
