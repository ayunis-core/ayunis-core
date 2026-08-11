import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrgsModule } from 'src/iam/orgs/orgs.module';
import { ConfigureOrgSsoConnectionUseCase } from 'src/iam/sso/application/use-cases/configure-org-sso-connection/configure-org-sso-connection.use-case';
import { SetOrgSsoEnabledUseCase } from 'src/iam/sso/application/use-cases/set-org-sso-enabled/set-org-sso-enabled.use-case';
import { SetOrgSsoJitProvisioningUseCase } from 'src/iam/sso/application/use-cases/set-org-sso-jit-provisioning/set-org-sso-jit-provisioning.use-case';
import { OrgSsoConnectionsRepository } from 'src/iam/sso/application/ports/org-sso-connections.repository';
import { PostgresOrgSsoConnectionsRepository } from 'src/iam/sso/infrastructure/persistence/postgres/org-sso-connections.repository';
import { OrgSsoConnectionMapper } from 'src/iam/sso/infrastructure/persistence/postgres/mappers/org-sso-connection.mapper';
import { FederatedIdentityRecord } from 'src/iam/sso/infrastructure/persistence/postgres/schema/federated-identity.record';
import { OrgSsoConnectionRecord } from 'src/iam/sso/infrastructure/persistence/postgres/schema/org-sso-connection.record';

@Module({
  imports: [
    TypeOrmModule.forFeature([OrgSsoConnectionRecord, FederatedIdentityRecord]),
    OrgsModule,
  ],
  providers: [
    OrgSsoConnectionMapper,
    {
      provide: OrgSsoConnectionsRepository,
      useClass: PostgresOrgSsoConnectionsRepository,
    },
    ConfigureOrgSsoConnectionUseCase,
    SetOrgSsoEnabledUseCase,
    SetOrgSsoJitProvisioningUseCase,
  ],
  exports: [
    ConfigureOrgSsoConnectionUseCase,
    SetOrgSsoEnabledUseCase,
    SetOrgSsoJitProvisioningUseCase,
  ],
})
export class SsoModule {}
