import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Transactional } from '@nestjs-cls/transactional';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedInviteError } from 'src/iam/invites/application/invites.errors';
import { InvitesRepository } from 'src/iam/invites/application/ports/invites.repository';
import {
  BulkInviteDeliveryService,
  type BulkInviteResult,
} from 'src/iam/invites/application/services/bulk-invite-delivery.service';
import { getInviteExpiresAt } from 'src/iam/invites/application/services/invite-expiration.util';
import { Invite } from 'src/iam/invites/domain/invite.entity';
import { AcquireSeatAllocationLockUseCase } from 'src/iam/subscriptions/application/use-cases/acquire-seat-allocation-lock/acquire-seat-allocation-lock.use-case';
import { ResendExpiredInvitesCommand } from './resend-expired-invites.command';

interface ResendExpiredInvitesResult {
  totalCount: number;
  successCount: number;
  failureCount: number;
  results: BulkInviteResult[];
}

@Injectable()
export class ResendExpiredInvitesUseCase {
  private readonly logger = new Logger(ResendExpiredInvitesUseCase.name);

  constructor(
    private readonly invitesRepository: InvitesRepository,
    private readonly configService: ConfigService,
    private readonly acquireAllocationLock: AcquireSeatAllocationLockUseCase,
    private readonly delivery: BulkInviteDeliveryService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedInviteError)
  async execute(
    command: ResendExpiredInvitesCommand,
  ): Promise<ResendExpiredInvitesResult> {
    this.logger.log({ orgId: command.orgId }, 'execute');

    const invites = await this.replaceExpiredInvites(command.orgId);
    const results = await this.delivery.deliver(invites, {
      discardUndelivered: false,
    });
    await this.expireUndelivered(invites, results);
    const successCount = results.filter((result) => result.success).length;

    this.logger.log(
      { orgId: command.orgId, totalCount: results.length, successCount },
      'Expired invites resent',
    );

    return {
      totalCount: results.length,
      successCount,
      failureCount: results.length - successCount,
      results,
    };
  }

  /**
   * Nobody received the token of an undelivered renewal, so it goes back to
   * expired: the invitee stays listed and the next resend retries it, whereas
   * deleting it would silently drop someone who was already invited.
   */
  private async expireUndelivered(
    invites: Invite[],
    results: BulkInviteResult[],
  ): Promise<void> {
    const undeliveredIds = invites
      .filter((_, index) => !results[index].success)
      .map((invite) => invite.id);
    await this.invitesRepository.expirePendingByIds(undeliveredIds, new Date());
  }

  /**
   * Swaps the expired invites for fresh ones inside the seat allocation lock,
   * so the reserved seats never appear vacant to a concurrent invitation.
   */
  @Transactional()
  private async replaceExpiredInvites(orgId: UUID): Promise<Invite[]> {
    await this.acquireAllocationLock.execute(orgId);
    const expiredInvites = await this.invitesRepository.findExpiredPendingByOrg(
      orgId,
      new Date(),
    );
    // Only invites this call deleted are replaced; one removed concurrently
    // (deleted or resent individually) must not come back.
    const deletedIds = new Set(
      await this.invitesRepository.deletePendingByIds(
        expiredInvites.map((invite) => invite.id),
      ),
    );
    const expiresAt = getInviteExpiresAt(
      this.configService.get<string>('auth.jwt.inviteExpiresIn', '7d'),
    );
    const replacements = expiredInvites
      .filter((invite) => deletedIds.has(invite.id))
      .map(
        (invite) =>
          new Invite({
            email: invite.email,
            orgId: invite.orgId,
            role: invite.role,
            inviterId: invite.inviterId,
            expiresAt,
            teamIds: invite.teamIds,
          }),
      );
    await this.invitesRepository.createMany(replacements);
    return replacements;
  }
}
