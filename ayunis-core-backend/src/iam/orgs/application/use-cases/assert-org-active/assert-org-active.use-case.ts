import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { OrgsRepository } from 'src/iam/orgs/application/ports/orgs.repository';
import {
  OrgAccessError,
  OrgNotFoundError,
  UnexpectedOrgError,
} from 'src/iam/orgs/application/orgs.errors';
import type { Org } from 'src/iam/orgs/domain/org.entity';
import type { AssertOrgActiveQuery } from './assert-org-active.query';

@Injectable()
export class AssertOrgActiveUseCase {
  private readonly logger = new Logger(AssertOrgActiveUseCase.name);
  constructor(private readonly orgs: OrgsRepository) {}

  @HandleUnexpectedErrors(UnexpectedOrgError, { databaseUnavailable: true })
  async execute(query: AssertOrgActiveQuery): Promise<Org> {
    this.logger.debug({ orgId: query.orgId }, 'Checking organisation access');
    const org = await this.orgs
      .findById(query.orgId, query.lockForLifecycle)
      .catch((error: unknown) => {
        if (error instanceof OrgNotFoundError) {
          throw new OrgAccessError();
        }
        throw error;
      });
    if (org.archived) {
      throw new OrgAccessError();
    }
    if (
      query.sessionVersion !== undefined &&
      query.sessionVersion !== org.sessionVersion
    ) {
      throw new OrgAccessError(true);
    }
    return org;
  }
}
