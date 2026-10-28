import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { OrgSsoConnectionsRepository } from 'src/iam/sso/application/ports/org-sso-connections.repository';
import { UnexpectedSsoError } from 'src/iam/sso/application/sso.errors';
import { GetOrgSsoConnectionQuery } from 'src/iam/sso/application/use-cases/get-org-sso-connection/get-org-sso-connection.query';
import type { OrgSsoConnection } from 'src/iam/sso/domain/org-sso-connection.entity';

@Injectable()
export class GetOrgSsoConnectionUseCase {
  private readonly logger = new Logger(GetOrgSsoConnectionUseCase.name);

  constructor(private readonly repository: OrgSsoConnectionsRepository) {}

  @HandleUnexpectedErrors(UnexpectedSsoError)
  async execute(
    query: GetOrgSsoConnectionQuery,
  ): Promise<OrgSsoConnection | null> {
    this.logger.log(
      {
        orgId: query.orgId,
      },
      'Getting organization SSO connection',
    );
    return this.repository.findByOrgId(query.orgId);
  }
}
