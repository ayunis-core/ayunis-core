import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { FindUsersByIdsUseCase } from 'src/iam/users/application/use-cases/find-users-by-ids/find-users-by-ids.use-case';
import { FindUsersByIdsQuery } from 'src/iam/users/application/use-cases/find-users-by-ids/find-users-by-ids.query';
import { GetAcademyCertificateUseCase } from 'src/domain/academy/application/use-cases/get-academy-certificate/get-academy-certificate.use-case';
import type { AcademyCertificateFile } from 'src/domain/academy/application/use-cases/get-academy-certificate/get-academy-certificate.use-case';
import { GetAcademyCertificateQuery } from 'src/domain/academy/application/use-cases/get-academy-certificate/get-academy-certificate.query';
import {
  OrgMemberNotFoundError,
  UnexpectedAcademyAccessError,
} from 'src/iam/academy-access/application/academy-access.errors';
import { GetOrgMemberCertificateQuery } from './get-org-member-certificate.query';

/**
 * The Teilnahmebestätigung of one member, for an admin of the same org. The
 * PDF itself comes from the academy's own use case, so an admin downloads
 * exactly what the member would.
 */
@Injectable()
export class GetOrgMemberCertificateUseCase {
  private readonly logger = new Logger(GetOrgMemberCertificateUseCase.name);

  constructor(
    private readonly findUsersByIdsUseCase: FindUsersByIdsUseCase,
    private readonly getAcademyCertificateUseCase: GetAcademyCertificateUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedAcademyAccessError)
  async execute(
    query: GetOrgMemberCertificateQuery,
  ): Promise<AcademyCertificateFile> {
    this.logger.log(
      { orgId: query.orgId, userId: query.userId },
      'Getting org member certificate',
    );

    // The org-scoped lookup answers "not a member" for an unknown id and for a
    // member of another org alike, so the response never reveals whether a
    // user id exists outside the admin's org.
    const members = await this.findUsersByIdsUseCase.execute(
      new FindUsersByIdsQuery([query.userId]),
    );
    const member = members.at(0);
    if (member?.orgId !== query.orgId) {
      throw new OrgMemberNotFoundError({ userId: query.userId });
    }

    return this.getAcademyCertificateUseCase.execute(
      new GetAcademyCertificateQuery({ userId: member.id }),
    );
  }
}
