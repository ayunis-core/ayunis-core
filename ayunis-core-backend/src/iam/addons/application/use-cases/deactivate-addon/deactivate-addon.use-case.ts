import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ApplicationError } from 'src/common/errors/base.error';
import { OrgAddonRepository } from '../../ports/org-addon.repository';
import { AddonDeactivatedEvent } from '../../events/addon-deactivated.event';
import { UnexpectedAddonError } from '../../addons.errors';
import { DeactivateAddonCommand } from './deactivate-addon.command';

@Injectable()
export class DeactivateAddonUseCase {
  constructor(
    @InjectPinoLogger(DeactivateAddonUseCase.name)
    private readonly logger: PinoLogger,
    private readonly orgAddonRepository: OrgAddonRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: DeactivateAddonCommand): Promise<void> {
    this.logger.info(
      {
        orgId: command.orgId,
        type: command.type,
      },
      'Deactivating addon',
    );

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
          this.logger.error(
            { err: err as Error, orgId: command.orgId, type: command.type },
            'Failed to emit AddonDeactivatedEvent',
          );
        });
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error({ err: error as Error }, 'Error deactivating addon');
      throw new UnexpectedAddonError('deactivate', { error: error as Error });
    }
  }
}
