import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrgSsoConnectionsRepository } from 'src/iam/sso/application/ports/org-sso-connections.repository';
import { GetOrgAuthenticationPolicyUseCase } from 'src/iam/sso/application/use-cases/get-org-authentication-policy/get-org-authentication-policy.use-case';
import { OrgSsoConnectionMapper } from 'src/iam/sso/infrastructure/persistence/postgres/mappers/org-sso-connection.mapper';
import { PostgresOrgSsoConnectionsRepository } from 'src/iam/sso/infrastructure/persistence/postgres/org-sso-connections.repository';
import { OrgSsoConnectionRecord } from 'src/iam/sso/infrastructure/persistence/postgres/schema/org-sso-connection.record';
import { OrgSsoEmailDomainRecord } from 'src/iam/sso/infrastructure/persistence/postgres/schema/org-sso-email-domain.record';

@Module({
  imports: [
    TypeOrmModule.forFeature([OrgSsoConnectionRecord, OrgSsoEmailDomainRecord]),
  ],
  providers: [
    OrgSsoConnectionMapper,
    {
      provide: OrgSsoConnectionsRepository,
      useClass: PostgresOrgSsoConnectionsRepository,
    },
    GetOrgAuthenticationPolicyUseCase,
  ],
  exports: [OrgSsoConnectionsRepository, GetOrgAuthenticationPolicyUseCase],
})
export class SsoConnectionPolicyModule {}
