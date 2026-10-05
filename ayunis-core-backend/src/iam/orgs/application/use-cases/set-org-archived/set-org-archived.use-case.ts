import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import { OrgsRepository } from 'src/iam/orgs/application/ports/orgs.repository';
import {
  OrgUnauthorizedError,
  UnexpectedOrgError,
} from 'src/iam/orgs/application/orgs.errors';
import { RevokeOrgSessionsUseCase } from 'src/iam/sessions/application/use-cases/revoke-org-sessions/revoke-org-sessions.use-case';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import type { Org } from 'src/iam/orgs/domain/org.entity';
import type { SetOrgArchivedCommand } from './set-org-archived.command';

@Injectable()
export class SetOrgArchivedUseCase {
  private readonly logger = new Logger(SetOrgArchivedUseCase.name);
  constructor(
    private readonly orgs: OrgsRepository,
    private readonly revokeSessions: RevokeOrgSessionsUseCase,
    private readonly context: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedOrgError)
  @Transactional()
  async execute(command: SetOrgArchivedCommand): Promise<Org> {
    this.logger.log(
      { orgId: command.orgId, archived: command.archived },
      'Setting organisation status',
    );
    if (this.context.get('systemRole') !== SystemRole.SUPER_ADMIN) {
      throw new OrgUnauthorizedError('Super admin privileges required');
    }
    const org = await this.orgs.updateArchived(command.orgId, command.archived);
    if (command.archived)
      await this.revokeSessions.execute({ orgId: command.orgId });
    return org;
  }
}
