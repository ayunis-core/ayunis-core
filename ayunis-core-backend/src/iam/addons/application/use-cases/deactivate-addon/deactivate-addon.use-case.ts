import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ApplicationError } from 'src/common/errors/base.error';
import { OrgAddonRepository } from '../../ports/org-addon.repository';
import { AddonDeactivatedEvent } from '../../events/addon-deactivated.event';
import { UnexpectedAddonError } from '../../addons.errors';
import { DeactivateAddonCommand } from './deactivate-addon.command';

@Injectable()
export class DeactivateAddonUseCase {
  private readonly logger = new Logger(DeactivateAddonUseCase.name);

  constructor(
    private readonly orgAddonRepository: OrgAddonRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: DeactivateAddonCommand): Promise<void> {
    this.logger.log('Deactivating addon', {
      orgId: command.orgId,
      type: command.type,
    });

    try {
      const existing = await this.orgAddonRepository.findByOrgAndType(
        command.orgId,
        command.type,
      );
      if (!existing) {
        // Already inactive — idempotent, no event.
        return;
      }

      await this.orgAddonRepository.delete(existing.id);

      this.eventEmitter
        .emitAsync(
          AddonDeactivatedEvent.EVENT_NAME,
          new AddonDeactivatedEvent(
            command.orgId,
            command.type,
            command.requestingUserId,
          ),
        )
        .catch((err: unknown) => {
          this.logger.error('Failed to emit AddonDeactivatedEvent', {
            error: err instanceof Error ? err.message : 'Unknown error',
            orgId: command.orgId,
            type: command.type,
          });
        });
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error('Error deactivating addon', { error: error as Error });
      throw new UnexpectedAddonError('deactivate', { error: error as Error });
    }
  }
}
