import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InvitesRepository } from 'src/iam/invites/application/ports/invites.repository';
import { CreateBulkInvitesCommand } from 'src/iam/invites/application/use-cases/create-bulk-invites/create-bulk-invites.command';
import { FindUsersByEmailsQuery } from 'src/iam/users/application/use-cases/find-users-by-emails/find-users-by-emails.query';
import { FindUsersByEmailsUseCase } from 'src/iam/users/application/use-cases/find-users-by-emails/find-users-by-emails.use-case';

export interface BulkInviteValidationError {
  row: number;
  email: string;
  errorCode: string;
  message: string;
}

@Injectable()
export class BulkInviteValidatorService {
  constructor(
    private readonly invites: InvitesRepository,
    private readonly findUsersByEmails: FindUsersByEmailsUseCase,
    private readonly config: ConfigService,
  ) {}

  async validate(
    command: CreateBulkInvitesCommand,
  ): Promise<BulkInviteValidationError[]> {
    const occurrences = emailOccurrences(command);
    const duplicateErrors = duplicateEmailErrors(occurrences);
    const uniqueEmails = [...occurrences.keys()];
    const [invites, users] = await Promise.all([
      this.invites.findByEmailsAndOrg(uniqueEmails, command.orgId),
      this.findUsersByEmails.execute(new FindUsersByEmailsQuery(uniqueEmails)),
    ]);
    return [
      ...duplicateErrors,
      ...this.rowErrors(
        command,
        occurrences,
        new Set(invites.map((invite) => invite.email.toLowerCase())),
        new Set(users.map((user) => user.email.toLowerCase())),
      ),
    ];
  }

  private rowErrors(
    command: CreateBulkInvitesCommand,
    occurrences: Map<string, number[]>,
    invitedEmails: Set<string>,
    userEmails: Set<string>,
  ): BulkInviteValidationError[] {
    const blacklist =
      this.config.get<string[]>('auth.emailProviderBlacklist') ?? [];
    return command.invites.flatMap((invite, index) => {
      const row = index + 1;
      const email = invite.email.toLowerCase();
      if (occurrences.get(email)?.[0] !== row) return [];
      const error = rowError(
        row,
        invite.email,
        blacklist,
        invitedEmails,
        userEmails,
      );
      return error ? [error] : [];
    });
  }
}

function emailOccurrences(
  command: CreateBulkInvitesCommand,
): Map<string, number[]> {
  const occurrences = new Map<string, number[]>();
  command.invites.forEach((invite, index) => {
    const email = invite.email.toLowerCase();
    occurrences.set(email, [...(occurrences.get(email) ?? []), index + 1]);
  });
  return occurrences;
}

function duplicateEmailErrors(
  occurrences: Map<string, number[]>,
): BulkInviteValidationError[] {
  return [...occurrences].flatMap(([email, rows]) =>
    rows.slice(1).map((row) => ({
      row,
      email,
      errorCode: 'DUPLICATE_EMAIL_IN_REQUEST',
      message: `Duplicate email in request (first occurrence at row ${rows[0]})`,
    })),
  );
}

function rowError(
  row: number,
  originalEmail: string,
  blacklist: string[],
  invitedEmails: Set<string>,
  userEmails: Set<string>,
): BulkInviteValidationError | null {
  const email = originalEmail.toLowerCase();
  const provider = email.split('@')[1]?.split('.')[0];
  if (provider && blacklist.includes(provider)) {
    return validationError(
      row,
      originalEmail,
      'EMAIL_PROVIDER_BLACKLISTED',
      'Email provider is not allowed',
    );
  }
  if (invitedEmails.has(email)) {
    return validationError(
      row,
      originalEmail,
      'EMAIL_ALREADY_INVITED',
      'Email already has a pending invite',
    );
  }
  if (userEmails.has(email)) {
    return validationError(
      row,
      originalEmail,
      'EMAIL_ALREADY_USER',
      'Email is already registered as a user',
    );
  }
  return null;
}

function validationError(
  row: number,
  email: string,
  errorCode: string,
  message: string,
): BulkInviteValidationError {
  return { row, email, errorCode, message };
}
