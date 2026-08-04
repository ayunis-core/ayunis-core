import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OrgsRepository } from '../../ports/orgs.repository';
import { CreateOrgCommand } from './create-org.command';
import { Org } from 'src/iam/orgs/domain/org.entity';
import { OrgCreationFailedError, UnexpectedOrgError } from '../../orgs.errors';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { OrgCreatedEvent } from '../../events/org-created.event';
import { SeedDefaultRolePermissionsUseCase } from 'src/iam/permissions/application/use-cases/seed-default-role-permissions/seed-default-role-permissions.use-case';
import { SeedDefaultRolePermissionsCommand } from 'src/iam/permissions/application/use-cases/seed-default-role-permissions/seed-default-role-permissions.command';

@Injectable()
export class CreateOrgUseCase {
  private readonly logger = new Logger(CreateOrgUseCase.name);

  constructor(
    private readonly orgsRepository: OrgsRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly seedDefaultRolePermissionsUseCase: SeedDefaultRolePermissionsUseCase,
  ) {}
  @HandleUnexpectedErrors(UnexpectedOrgError)
  async execute(command: CreateOrgCommand): Promise<Org> {
    this.logger.log('create', { name: command.name });

    if (!command.name || command.name.trim() === '') {
      this.logger.warn('Attempted to create organization with empty name');
      throw new OrgCreationFailedError('Organization name cannot be empty');
    }

    const org = new Org({ name: command.name });
    const createdOrg = await this.orgsRepository.create(org);
    this.logger.debug('Organization created successfully', {
      id: createdOrg.id,
      name: createdOrg.name,
    });

    await this.seedDefaultRolePermissionsUseCase.execute(
      new SeedDefaultRolePermissionsCommand(createdOrg.id),
    );

    this.eventEmitter
      .emitAsync(
        OrgCreatedEvent.EVENT_NAME,
        new OrgCreatedEvent(createdOrg.id, createdOrg),
      )
      .catch((err: unknown) => {
        this.logger.error('Failed to emit OrgCreatedEvent', {
          error: err instanceof Error ? err.message : 'Unknown error',
          orgId: createdOrg.id,
        });
      });

    return createdOrg;
  }
}
