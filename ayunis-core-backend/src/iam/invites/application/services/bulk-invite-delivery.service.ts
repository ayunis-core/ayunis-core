import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApplicationError } from 'src/common/errors/base.error';
import { InvitesRepository } from 'src/iam/invites/application/ports/invites.repository';
import { InviteJwtService } from 'src/iam/invites/application/services/invite-jwt.service';
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

  /**
   * With `discardUndelivered`, an invite whose email cannot be sent is deleted
   * so it neither reserves a seat nor blocks inviting the address again.
   */
  async deliver(
    invites: Invite[],
    options: { discardUndelivered: boolean },
  ): Promise<BulkInviteResult[]> {
    const results: BulkInviteResult[] = [];
    for (const invite of invites) {
      results.push(await this.deliverOne(invite, options));
    }
    return results;
  }

  private async deliverOne(
    invite: Invite,
    options: { discardUndelivered: boolean },
  ): Promise<BulkInviteResult> {
    let url: string;
    try {
      url = this.acceptUrl(invite);
    } catch (error: unknown) {
      return this.failedDelivery(invite, options, error);
    }
    if (!this.config.get<boolean>('emails.hasConfig')) {
      return success(invite, url);
    }
    try {
      await this.sendEmail.execute(new SendInvitationEmailCommand(invite, url));
      return success(invite, null);
    } catch (error: unknown) {
      return this.failedDelivery(
        invite,
        options,
        error,
        'EMAIL_SENDING_FAILED',
      );
    }
  }

  private async failedDelivery(
    invite: Invite,
    options: { discardUndelivered: boolean },
    error: unknown,
    errorCode?: string,
  ): Promise<BulkInviteResult> {
    this.logger.warn(
      { email: invite.email, error: message(error) },
      'Failed to deliver invitation',
    );
    if (options.discardUndelivered) {
      await this.deleteFailedInvite(invite);
    }
    return failure(invite, error, errorCode);
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
      this.logger.error(
        { inviteId: invite.id, email: invite.email, error: message(error) },
        'Failed to delete undelivered invite',
      );
    }
  }
}

function success(invite: Invite, url: string | null): BulkInviteResult {
  return {
    email: invite.email,
    role: invite.role,
    success: true,
    url,
    errorCode: null,
    errorMessage: null,
  };
}

function failure(
  invite: Invite,
  error: unknown,
  errorCode?: string,
): BulkInviteResult {
  return {
    email: invite.email,
    role: invite.role,
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
