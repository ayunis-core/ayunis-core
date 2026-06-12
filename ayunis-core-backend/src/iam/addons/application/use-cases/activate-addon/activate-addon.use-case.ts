import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ApplicationError } from 'src/common/errors/base.error';
import { OrgAddon } from '../../../domain/org-addon.entity';
import { OrgAddonRepository } from '../../ports/org-addon.repository';
import { AddonActivatedEvent } from '../../events/addon-activated.event';
import { UnexpectedAddonError } from '../../addons.errors';
import { ActivateAddonCommand } from './activate-addon.command';

@Injectable()
export class ActivateAddonUseCase {
  private readonly logger = new Logger(ActivateAddonUseCase.name);

  constructor(
    private readonly orgAddonRepository: OrgAddonRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: ActivateAddonCommand): Promise<void> {
    this.logger.log('Activating addon', {
      orgId: command.orgId,
      type: command.type,
    });

    try {
      const existing = await this.orgAddonRepository.findByOrgAndType(
        command.orgId,
        command.type,
      );
      if (existing) {
        // Already active — idempotent, no event.
        return;
      }

      const addon = new OrgAddon({
        orgId: command.orgId,
        type: command.type,
      });
      await this.orgAddonRepository.create(addon);

      this.eventEmitter
        .emitAsync(
          AddonActivatedEvent.EVENT_NAME,
          new AddonActivatedEvent(
            command.orgId,
            command.type,
            command.requestingUserId,
          ),
        )
        .catch((err: unknown) => {
          this.logger.error('Failed to emit AddonActivatedEvent', {
            error: err instanceof Error ? err.message : 'Unknown error',
            orgId: command.orgId,
            type: command.type,
          });
        });
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error('Error activating addon', { error: error as Error });
      throw new UnexpectedAddonError('activate', { error: error as Error });
    }
  }
}
