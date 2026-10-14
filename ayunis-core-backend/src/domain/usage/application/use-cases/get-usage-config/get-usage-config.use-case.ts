import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ContextService } from 'src/common/context/services/context.service';
import {
  getRequiredOrgId,
  isSuperAdmin,
} from 'src/common/context/required-context';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { FindOrgByIdUseCase } from 'src/iam/orgs/application/use-cases/find-org-by-id/find-org-by-id.use-case';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { GetUsageConfigQuery } from './get-usage-config.query';
import { UnexpectedUsageError } from 'src/domain/usage/application/usage.errors';

@Injectable()
export class GetUsageConfigUseCase {
  private readonly logger = new Logger(GetUsageConfigUseCase.name);
  constructor(
    private readonly findOrg: FindOrgByIdUseCase,
    private readonly context: ContextService,
    private readonly config: ConfigService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedUsageError)
  async execute(
    query: GetUsageConfigQuery = new GetUsageConfigQuery(),
  ): Promise<{
    isSelfHosted: boolean;
    hideIndividualUsage: boolean;
  }> {
    if (query.orgId && !isSuperAdmin(this.context)) {
      throw new UnauthorizedAccessError();
    }
    const orgId = query.orgId ?? getRequiredOrgId(this.context);
    this.logger.log({ orgId }, 'Getting usage configuration');
    const org = await this.findOrg.execute({ id: orgId });
    return {
      isSelfHosted: this.config.get<boolean>('app.isSelfHosted', false),
      hideIndividualUsage: org.hideIndividualUsage,
    };
  }
}
