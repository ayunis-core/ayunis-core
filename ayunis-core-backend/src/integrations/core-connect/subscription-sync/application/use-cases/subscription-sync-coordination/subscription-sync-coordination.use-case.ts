import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { assertSubscriptionSyncEnabled } from 'src/integrations/core-connect/subscription-sync/application/util/assert-subscription-sync-enabled.helper';
import { SubscriptionSyncLease } from 'src/integrations/core-connect/subscription-sync/application/ports/subscription-sync-lease';
import { UnexpectedSubscriptionSyncError } from 'src/integrations/core-connect/subscription-sync/application/subscription-sync.errors';

type LeaseCommand = { ownerId: string; action: 'acquire' | 'release' };
@Injectable()
export class SubscriptionSyncCoordinationUseCase {
  private readonly logger = new Logger(
    SubscriptionSyncCoordinationUseCase.name,
  );
  constructor(
    private readonly config: ConfigService,
    private readonly lease: SubscriptionSyncLease,
  ) {}
  @HandleUnexpectedErrors(UnexpectedSubscriptionSyncError)
  async execute(command: LeaseCommand): Promise<{ acquired: boolean }> {
    this.logger.log('Coordinating external subscription synchronization');
    assertSubscriptionSyncEnabled(this.config);
    if (command.action === 'acquire')
      return { acquired: await this.lease.acquire(command.ownerId as UUID) };
    await this.lease.release(command.ownerId as UUID);
    return { acquired: false };
  }
}
