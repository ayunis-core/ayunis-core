import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ApplicationError } from 'src/common/errors/base.error';
import { OrgAddon } from 'src/iam/addons/domain/org-addon.entity';
import { OrgAddonRepository } from '../../ports/org-addon.repository';
import { AddonActivatedEvent } from '../../events/addon-activated.event';
import { UnexpectedAddonError } from '../../addons.errors';
import { ActivateAddonCommand } from './activate-addon.command';

@Injectable()
export class ActivateAddonUseCase {
  constructor(
    @InjectPinoLogger(ActivateAddonUseCase.name)
    private readonly logger: PinoLogger,
    private readonly orgAddonRepository: OrgAddonRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: ActivateAddonCommand): Promise<void> {
    this.logger.info(
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
