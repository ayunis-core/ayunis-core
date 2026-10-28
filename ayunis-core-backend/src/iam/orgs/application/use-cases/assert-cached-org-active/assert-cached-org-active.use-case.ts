import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import {
  OrgAccessError,
  UnexpectedOrgError,
} from 'src/iam/orgs/application/orgs.errors';
import { OrgAuthenticationStateCacheService } from 'src/iam/orgs/application/services/org-authentication-state-cache.service';
import { AssertOrgActiveUseCase } from 'src/iam/orgs/application/use-cases/assert-org-active/assert-org-active.use-case';

@Injectable()
export class AssertCachedOrgActiveUseCase {
  constructor(
    private readonly assertOrgActive: AssertOrgActiveUseCase,
    private readonly cache: OrgAuthenticationStateCacheService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedOrgError)
  async execute(query: {
    orgId: UUID;
    sessionVersion?: number;
  }): Promise<void> {
    const load = async () => {
      const org = await this.assertOrgActive.execute({ orgId: query.orgId });
      return org.sessionVersion;
    };
    let version = await this.cache.getOrLoad(query.orgId, load);
    if (query.sessionVersion !== undefined && query.sessionVersion > version) {
      // A freshly issued post-restore token can be newer than the cached state.
      await this.cache.invalidateIfVersion(query.orgId, version);
      version = await this.cache.getOrLoad(query.orgId, load);
    }
    if (
      query.sessionVersion !== undefined &&
      query.sessionVersion !== version
    ) {
      throw new OrgAccessError(true);
    }
  }
}
