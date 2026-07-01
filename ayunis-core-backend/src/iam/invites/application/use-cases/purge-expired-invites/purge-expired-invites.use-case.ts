import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InvitesRepository } from '../../ports/invites.repository';
import { UnexpectedInviteError } from '../../invites.errors';
import { ApplicationError } from '../../../../../common/errors/base.error';
import type { PurgeExpiredInvitesResult } from './purge-expired-invites.result';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DEFAULT_GRACE_DAYS = 30;

/**
 * TTL purge for expired, unaccepted invites. Deletes invites whose `expiresAt`
 * is older than the configured grace period so that stale personal data
 * (invitee email addresses) is not retained indefinitely. Accepted invites are
 * never touched (see AYC-299). Supports a dry-run mode that only reports the
 * impact.
 */
@Injectable()
export class PurgeExpiredInvitesUseCase {
  private readonly logger = new Logger(PurgeExpiredInvitesUseCase.name);

  constructor(
    private readonly invitesRepository: InvitesRepository,
    private readonly configService: ConfigService,
  ) {}

  async execute(): Promise<PurgeExpiredInvitesResult> {
    const graceDays =
      this.configService.get<number>('purge.inviteGraceDays') ??
      DEFAULT_GRACE_DAYS;
    const dryRun = this.configService.get<boolean>('purge.dryRun') ?? false;
    const cutoff = new Date(Date.now() - graceDays * MS_PER_DAY);

    this.logger.log('Starting expired invite purge', {
      cutoff,
      graceDays,
      dryRun,
    });

    try {
      if (dryRun) {
        const matchedCount =
          await this.invitesRepository.countExpiredBefore(cutoff);
        this.logger.log('Expired invite purge dry-run complete', {
          matchedCount,
          cutoff,
        });
        return { deletedCount: 0, matchedCount, cutoff, graceDays, dryRun };
      }

      const deletedCount =
        await this.invitesRepository.deleteExpiredBefore(cutoff);
      this.logger.log('Expired invite purge complete', {
        deletedCount,
        cutoff,
      });
      return {
        deletedCount,
        matchedCount: deletedCount,
        cutoff,
        graceDays,
        dryRun,
      };
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error('Error purging expired invites', {
        error: error as Error,
      });
      throw new UnexpectedInviteError(error as Error);
    }
  }
}
