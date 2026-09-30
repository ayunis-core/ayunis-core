import { Injectable } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import {
  EmailVerificationResult,
  UsersRepository,
} from 'src/iam/users/application/ports/users.repository';
import type { VerifyUserEmailCommand } from 'src/iam/users/application/use-cases/verify-user-email/verify-user-email.command';

@Injectable()
export class VerifyUserEmailUseCase {
  constructor(private readonly users: UsersRepository) {}

  @Transactional()
  execute(
    command: VerifyUserEmailCommand,
  ): Promise<EmailVerificationResult | null> {
    return this.users.verifyEmailIfMatches(command.userId, command.email);
  }
}
