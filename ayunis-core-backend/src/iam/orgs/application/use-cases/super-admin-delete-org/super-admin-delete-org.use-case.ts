import { Injectable, Logger } from '@nestjs/common';
import { ContextService } from 'src/common/context/services/context.service';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import {
  OrgDeleteConfirmationError,
  OrgUnauthorizedError,
  UnexpectedOrgError,
} from 'src/iam/orgs/application/orgs.errors';
import { OrgsRepository } from 'src/iam/orgs/application/ports/orgs.repository';
import { DeleteOrgUseCase } from 'src/iam/orgs/application/use-cases/delete-org/delete-org.use-case';
import { DeleteOrgCommand } from 'src/iam/orgs/application/use-cases/delete-org/delete-org.command';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import type { SuperAdminDeleteOrgCommand } from './super-admin-delete-org.command';
@Injectable()
export class SuperAdminDeleteOrgUseCase {
  private readonly logger = new Logger(SuperAdminDeleteOrgUseCase.name);
  constructor(
    private readonly orgs: OrgsRepository,
    private readonly deletion: DeleteOrgUseCase,
    private readonly context: ContextService,
  ) {}
  @HandleUnexpectedErrors(UnexpectedOrgError)
  async execute(command: SuperAdminDeleteOrgCommand): Promise<void> {
    this.logger.log(
      { orgId: command.orgId },
      'Deleting organisation as super admin',
    );
    if (this.context.get('systemRole') !== SystemRole.SUPER_ADMIN)
      throw new OrgUnauthorizedError('Super admin privileges required');
    const org = await this.orgs.findById(command.orgId);
    if (command.confirmationName !== org.name)
      throw new OrgDeleteConfirmationError();
    await this.deletion.execute(
      new DeleteOrgCommand(command.orgId, command.confirmationName, true),
    );
  }
}
