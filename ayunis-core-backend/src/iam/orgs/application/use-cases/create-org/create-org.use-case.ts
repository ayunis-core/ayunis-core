import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OrgsRepository } from 'src/iam/orgs/application/ports/orgs.repository';
import { CreateOrgCommand } from './create-org.command';
import { Org } from 'src/iam/orgs/domain/org.entity';
import {
  OrgCreationFailedError,
  UnexpectedOrgError,
} from 'src/iam/orgs/application/orgs.errors';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { OrgCreatedEvent } from 'src/iam/orgs/application/events/org-created.event';
import { SeedDefaultRolePermissionsUseCase } from 'src/iam/permissions/application/use-cases/seed-default-role-permissions/seed-default-role-permissions.use-case';
import { SeedDefaultRolePermissionsCommand } from 'src/iam/permissions/application/use-cases/seed-default-role-permissions/seed-default-role-permissions.command';
import { Transactional } from '@nestjs-cls/transactional';

@Injectable()
export class CreateOrgUseCase {
  constructor(
    @InjectPinoLogger(CreateOrgUseCase.name)
    private readonly logger: PinoLogger,
    private readonly orgsRepository: OrgsRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly seedDefaultRolePermissionsUseCase: SeedDefaultRolePermissionsUseCase,
  ) {}
  @Transactional()
  @HandleUnexpectedErrors(UnexpectedOrgError)
  async execute(command: CreateOrgCommand): Promise<Org> {
    this.logger.info({ name: command.name }, 'create');

    if (!command.name || command.name.trim() === '') {
      this.logger.warn('Attempted to create organization with empty name');
      throw new OrgCreationFailedError('Organization name cannot be empty');
    }

    const org = new Org({ name: command.name });
    const createdOrg = await this.orgsRepository.create(org);
    this.logger.debug(
      {
        id: createdOrg.id,
        name: createdOrg.name,
      },
      'Organization created successfully',
    );

    await this.seedDefaultRolePermissionsUseCase.execute(
      new SeedDefaultRolePermissionsCommand(createdOrg.id),
    );

    this.eventEmitter
      .emitAsync(
        OrgCreatedEvent.EVENT_NAME,
        new OrgCreatedEvent(createdOrg.id, createdOrg),
      )
      .catch((err: unknown) => {
        this.logger.error(
          {
            err: err as Error,
            orgId: createdOrg.id,
          },
          'Failed to emit OrgCreatedEvent',
        );
      });

    return createdOrg;
  }
}
