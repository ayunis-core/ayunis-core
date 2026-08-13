import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApplicationError } from 'src/common/errors/base.error';
import { InvitesRepository } from 'src/iam/invites/application/ports/invites.repository';
import { InviteJwtService } from 'src/iam/invites/application/services/invite-jwt.service';
import { CreateBulkInvitesCommand } from 'src/iam/invites/application/use-cases/create-bulk-invites/create-bulk-invites.command';
import { SendInvitationEmailCommand } from 'src/iam/invites/application/use-cases/send-invitation-email/send-invitation-email.command';
import { SendInvitationEmailUseCase } from 'src/iam/invites/application/use-cases/send-invitation-email/send-invitation-email.use-case';
import type { Invite } from 'src/iam/invites/domain/invite.entity';
import type { UserRole } from 'src/iam/users/domain/value-objects/role.object';

export interface BulkInviteResult {
  email: string;
  role: UserRole;
  success: boolean;
  url: string | null;
  errorCode: string | null;
  errorMessage: string | null;
}

@Injectable()
export class BulkInviteDeliveryService {
  private readonly logger = new Logger(BulkInviteDeliveryService.name);

  constructor(
    private readonly invites: InvitesRepository,
    private readonly jwt: InviteJwtService,
    private readonly sendEmail: SendInvitationEmailUseCase,
    private readonly config: ConfigService,
  ) {}

  async deliver(
    command: CreateBulkInvitesCommand,
    invites: Invite[],
  ): Promise<BulkInviteResult[]> {
    const results: BulkInviteResult[] = [];
    for (let index = 0; index < invites.length; index++) {
      results.push(await this.deliverOne(command, invites[index], index));
    }
    return results;
  }

  private async deliverOne(
    command: CreateBulkInvitesCommand,
    invite: Invite,
    index: number,
  ): Promise<BulkInviteResult> {
    const input = command.invites[index];
    let url: string;
    try {
      url = this.acceptUrl(invite);
    } catch (error: unknown) {
      return this.failedDelivery(invite, input.email, input.role, error);
    }
    if (!this.config.get<boolean>('emails.hasConfig')) {
      return success(input.email, input.role, url);
    }
    try {
      await this.sendEmail.execute(new SendInvitationEmailCommand(invite, url));
      return success(input.email, input.role, null);
    } catch (error: unknown) {
      return this.failedDelivery(
        invite,
        input.email,
        input.role,
        error,
        'EMAIL_SENDING_FAILED',
      );
    }
  }

  private async failedDelivery(
    invite: Invite,
    email: string,
    role: UserRole,
    error: unknown,
    errorCode?: string,
  ): Promise<BulkInviteResult> {
    this.logger.warn('Failed to deliver invitation', {
      email,
      error: message(error),
    });
    await this.deleteFailedInvite(invite);
    return failure(email, role, error, errorCode);
  }

  private acceptUrl(invite: Invite): string {
    const token = this.jwt.generateInviteToken({ inviteId: invite.id });
    const baseUrl = this.config.get<string>('app.frontend.baseUrl');
    const endpoint = this.config.get<string>(
      'app.frontend.inviteAcceptEndpoint',
    );
    return `${baseUrl}${endpoint}?token=${token}`;
  }

  private async deleteFailedInvite(invite: Invite): Promise<void> {
    try {
      await this.invites.delete(invite.id);
    } catch (error: unknown) {
      this.logger.error('Failed to delete undelivered invite', {
        inviteId: invite.id,
        email: invite.email,
        error: message(error),
      });
    }
  }
}

function success(
  email: string,
  role: UserRole,
  url: string | null,
): BulkInviteResult {
  return {
    email,
    role,
    success: true,
    url,
    errorCode: null,
    errorMessage: null,
  };
}

function failure(
  email: string,
  role: UserRole,
  error: unknown,
  errorCode?: string,
): BulkInviteResult {
  return {
    email,
    role,
    success: false,
    url: null,
    errorCode:
      errorCode ??
      (error instanceof ApplicationError ? error.code : 'UNEXPECTED_ERROR'),
    errorMessage: message(error),
  };
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}
