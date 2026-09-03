import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ApplicationError } from 'src/common/errors/base.error';
import { OrgAddon } from 'src/iam/addons/domain/org-addon.entity';
import { OrgAddonRepository } from 'src/iam/addons/application/ports/org-addon.repository';
import { AddonActivatedEvent } from 'src/iam/addons/application/events/addon-activated.event';
import { UnexpectedAddonError } from 'src/iam/addons/application/addons.errors';
import { ActivateAddonCommand } from './activate-addon.command';

@Injectable()
export class ActivateAddonUseCase {
  private readonly logger = new Logger(ActivateAddonUseCase.name);

  constructor(
    private readonly orgAddonRepository: OrgAddonRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: ActivateAddonCommand): Promise<void> {
    this.logger.log(
      {
        orgId: command.orgId,
        type: command.type,
      },
      'Activating addon',
    );

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
          this.logger.error(
            { err: err as Error, orgId: command.orgId, type: command.type },
            'Failed to emit AddonActivatedEvent',
          );
        });
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error({ err: error as Error }, 'Error activating addon');
      throw new UnexpectedAddonError('activate', { error: error as Error });
    }
  }
}
