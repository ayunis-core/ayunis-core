import { Injectable, Logger } from '@nestjs/common';
import { ContextService } from 'src/common/context/services/context.service';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { AssertTeamManagementAllowedUseCase } from 'src/iam/teams/application/use-cases/assert-team-management-allowed/assert-team-management-allowed.use-case';
import {
  TeamManagementRestrictedError,
  UnexpectedTeamError,
} from 'src/iam/teams/application/teams.errors';

@Injectable()
export class GetTeamManagementAccessUseCase {
  private readonly logger = new Logger(GetTeamManagementAccessUseCase.name);
  constructor(
    private readonly context: ContextService,
    private readonly assertAccess: AssertTeamManagementAllowedUseCase,
  ) {}
  @HandleUnexpectedErrors(UnexpectedTeamError)
  async execute(): Promise<{ canManage: boolean }> {
    const { orgId } = getRequiredUserContext(this.context);
    this.logger.log({ orgId }, 'Getting team management access');
    try {
      await this.assertAccess.execute({ orgId });
      return { canManage: true };
    } catch (error) {
      if (error instanceof TeamManagementRestrictedError)
        return { canManage: false };
      throw error;
    }
  }
}
