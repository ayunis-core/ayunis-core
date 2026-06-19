import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InvitesRepository } from '../../ports/invites.repository';
import { Invite } from 'src/iam/invites/domain/invite.entity';
import { SendPreparedInvitesCommand } from './send-prepared-invites.command';
import { InviteJwtService } from '../../services/invite-jwt.service';
import { SendInvitationEmailUseCase } from '../send-invitation-email/send-invitation-email.use-case';
import { SendInvitationEmailCommand } from '../send-invitation-email/send-invitation-email.command';
import { UnexpectedInviteError } from '../../invites.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { getInviteExpiresAt } from '../../services/invite-expiration.util';

interface SendPreparedInviteResult {
  email: string;
  role: UserRole;
  success: boolean;
  url: string | null;
  errorCode: string | null;
  errorMessage: string | null;
}

interface SendPreparedInvitesResult {
  totalCount: number;
  successCount: number;
  failureCount: number;
  results: SendPreparedInviteResult[];
}

@Injectable()
export class SendPreparedInvitesUseCase {
  private readonly logger = new Logger(SendPreparedInvitesUseCase.name);

  constructor(
    private readonly invitesRepository: InvitesRepository,
    private readonly inviteJwtService: InviteJwtService,
    private readonly sendInvitationEmailUseCase: SendInvitationEmailUseCase,
    private readonly configService: ConfigService,
  ) {}

  async execute(
    command: SendPreparedInvitesCommand,
  ): Promise<SendPreparedInvitesResult> {
    this.logger.log('execute', {
      orgId: command.orgId,
      userId: command.userId,
    });

    try {
      const prepared = await this.invitesRepository.findPreparedByOrg(
        command.orgId,
      );

      if (prepared.length === 0) {
        return { totalCount: 0, successCount: 0, failureCount: 0, results: [] };
      }

      const results = await this.dispatchInvites(prepared);
      const successCount = results.filter((r) => r.success).length;
      const failureCount = results.length - successCount;

      this.logger.log('Prepared invites sent', {
        orgId: command.orgId,
        totalCount: prepared.length,
        successCount,
        failureCount,
      });

      return {
        totalCount: prepared.length,
        successCount,
        failureCount,
        results,
      };
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error('Error sending prepared invites', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new UnexpectedInviteError(error as Error);
    }
  }

  private async dispatchInvites(
    invites: Invite[],
  ): Promise<SendPreparedInviteResult[]> {
    const hasEmailConfig =
      this.configService.get<boolean>('emails.hasConfig') ?? false;
    const validDuration = this.configService.get<string>(
      'auth.jwt.inviteExpiresIn',
      '7d',
    );

    const results: SendPreparedInviteResult[] = [];
    for (const invite of invites) {
      results.push(
        await this.dispatchOne(invite, hasEmailConfig, validDuration),
      );
    }
    return results;
  }

  private async dispatchOne(
    invite: Invite,
    hasEmailConfig: boolean,
    validDuration: string,
  ): Promise<SendPreparedInviteResult> {
    try {
      const expiresAt = getInviteExpiresAt(validDuration);
      const token = this.inviteJwtService.generateInviteToken({
        inviteId: invite.id,
      });
      const url = this.buildAcceptUrl(token);

      invite.markAsSent(expiresAt);

      if (hasEmailConfig) {
        await this.sendInvitationEmailUseCase.execute(
          new SendInvitationEmailCommand(invite, url),
        );
      }

      await this.invitesRepository.markAsSent(invite.id, invite.expiresAt);

      return {
        email: invite.email,
        role: invite.role,
        success: true,
        url: hasEmailConfig ? null : url,
        errorCode: null,
        errorMessage: null,
      };
    } catch (error) {
      this.logger.warn('Failed to send prepared invite', {
        inviteId: invite.id,
        email: invite.email,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {
        email: invite.email,
        role: invite.role,
        success: false,
        url: null,
        errorCode:
          error instanceof ApplicationError ? error.code : 'UNEXPECTED_ERROR',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private buildAcceptUrl(token: string): string {
    const frontendBaseUrl = this.configService.get<string>(
      'app.frontend.baseUrl',
    );
    const inviteAcceptEndpoint = this.configService.get<string>(
      'app.frontend.inviteAcceptEndpoint',
    );
    return `${frontendBaseUrl}${inviteAcceptEndpoint}?token=${token}`;
  }
}
