import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiKeysRepository } from '../../ports/api-keys.repository';
import { UnexpectedApiKeyError } from '../../api-keys.errors';
import { ApplicationError } from '../../../../../common/errors/base.error';
import type { PurgeExpiredApiKeysResult } from './purge-expired-api-keys.result';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DEFAULT_GRACE_DAYS = 30;

/**
 * TTL purge for expired API keys. Deletes keys whose `expiresAt` is older than
 * the configured grace period so that stale credentials are not retained
 * indefinitely. Keys without an expiry (and revoked-but-not-expired keys) are
 * left untouched. Supports a dry-run mode that only reports the impact.
 */
@Injectable()
export class PurgeExpiredApiKeysUseCase {
  private readonly logger = new Logger(PurgeExpiredApiKeysUseCase.name);

  constructor(
    private readonly apiKeysRepository: ApiKeysRepository,
    private readonly configService: ConfigService,
  ) {}

  async execute(): Promise<PurgeExpiredApiKeysResult> {
    const graceDays =
      this.configService.get<number>('purge.apiKeyGraceDays') ??
      DEFAULT_GRACE_DAYS;
    const dryRun = this.configService.get<boolean>('purge.dryRun') ?? false;
    const cutoff = new Date(Date.now() - graceDays * MS_PER_DAY);

    this.logger.log('Starting expired API key purge', {
      cutoff,
      graceDays,
      dryRun,
    });

    try {
      if (dryRun) {
        const matchedCount =
          await this.apiKeysRepository.countExpiredBefore(cutoff);
        this.logger.log('Expired API key purge dry-run complete', {
          matchedCount,
          cutoff,
        });
        return { deletedCount: 0, matchedCount, cutoff, graceDays, dryRun };
      }

      const deletedCount =
        await this.apiKeysRepository.deleteExpiredBefore(cutoff);
      this.logger.log('Expired API key purge complete', {
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
      this.logger.error('Error purging expired API keys', {
        error: error as Error,
      });
      throw new UnexpectedApiKeyError();
    }
  }
}
