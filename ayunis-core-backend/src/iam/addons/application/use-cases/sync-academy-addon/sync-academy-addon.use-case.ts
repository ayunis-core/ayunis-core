import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import type { PendingDomainEvent } from 'src/common/events/pending-domain-event';
import { OrgAddonRepository } from 'src/iam/addons/application/ports/org-addon.repository';
import { OrgAddon } from 'src/iam/addons/domain/org-addon.entity';
import { AddonType } from 'src/iam/addons/domain/value-objects/addon-type.enum';
import { AddonActivatedEvent } from 'src/iam/addons/application/events/addon-activated.event';
import { AddonDeactivatedEvent } from 'src/iam/addons/application/events/addon-deactivated.event';
import { UnexpectedAddonSyncError } from 'src/iam/addons/application/addons.errors';

@Injectable()
export class SyncAcademyAddonUseCase {
  private readonly logger = new Logger(SyncAcademyAddonUseCase.name);

  constructor(private readonly addons: OrgAddonRepository) {}

  @HandleUnexpectedErrors(UnexpectedAddonSyncError)
  async execute(command: {
    orgId: UUID;
    active: boolean;
  }): Promise<PendingDomainEvent[]> {
    this.logger.log(
      { orgId: command.orgId, active: command.active },
      'Synchronizing Academy entitlement',
    );
    const type = AddonType.AYUNIS_CORE_ACADEMY;
    const existing = await this.addons.findByOrgAndType(command.orgId, type);
    if (command.active && !existing) {
      await this.addons.create(new OrgAddon({ orgId: command.orgId, type }));
      return [
        {
          name: AddonActivatedEvent.EVENT_NAME,
          event: new AddonActivatedEvent(command.orgId, type, null),
        },
      ];
    }
    if (!command.active && existing) {
      await this.addons.delete(existing.id);
      return [
        {
          name: AddonDeactivatedEvent.EVENT_NAME,
          event: new AddonDeactivatedEvent(command.orgId, type, null),
        },
      ];
    }
    return [];
  }
}
