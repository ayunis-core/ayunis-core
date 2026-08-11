import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrgsModule } from 'src/iam/orgs/orgs.module';
import { ConfigureOrgSsoConnectionUseCase } from 'src/iam/sso/application/use-cases/configure-org-sso-connection/configure-org-sso-connection.use-case';
import { SetOrgSsoEnabledUseCase } from 'src/iam/sso/application/use-cases/set-org-sso-enabled/set-org-sso-enabled.use-case';
import { SetOrgSsoJitProvisioningUseCase } from 'src/iam/sso/application/use-cases/set-org-sso-jit-provisioning/set-org-sso-jit-provisioning.use-case';
import { GetOrgSsoConnectionUseCase } from 'src/iam/sso/application/use-cases/get-org-sso-connection/get-org-sso-connection.use-case';
import { OrgSsoConnectionsRepository } from 'src/iam/sso/application/ports/org-sso-connections.repository';
import { PostgresOrgSsoConnectionsRepository } from 'src/iam/sso/infrastructure/persistence/postgres/org-sso-connections.repository';
import { OrgSsoConnectionMapper } from 'src/iam/sso/infrastructure/persistence/postgres/mappers/org-sso-connection.mapper';
import { FederatedIdentityRecord } from 'src/iam/sso/infrastructure/persistence/postgres/schema/federated-identity.record';
import { OrgSsoConnectionRecord } from 'src/iam/sso/infrastructure/persistence/postgres/schema/org-sso-connection.record';
import { SuperAdminSsoConnectionsController } from 'src/iam/sso/presenters/http/super-admin-sso-connections.controller';
import { OrgSsoConnectionResponseDtoMapper } from 'src/iam/sso/presenters/http/mappers/org-sso-connection-response-dto.mapper';
import { OidcBrokerClient } from 'src/iam/sso/application/ports/oidc-broker.client';
import { ZitadelOidcBrokerClient } from 'src/iam/sso/infrastructure/oidc/zitadel-oidc-broker.client';

@Module({
  imports: [
    TypeOrmModule.forFeature([OrgSsoConnectionRecord, FederatedIdentityRecord]),
    OrgsModule,
  ],
  controllers: [SuperAdminSsoConnectionsController],
  providers: [
    OrgSsoConnectionMapper,
    OrgSsoConnectionResponseDtoMapper,
    {
      provide: OrgSsoConnectionsRepository,
      useClass: PostgresOrgSsoConnectionsRepository,
    },
    {
      provide: OidcBrokerClient,
      useClass: ZitadelOidcBrokerClient,
    },
    ConfigureOrgSsoConnectionUseCase,
    SetOrgSsoEnabledUseCase,
    SetOrgSsoJitProvisioningUseCase,
    GetOrgSsoConnectionUseCase,
  ],
  exports: [
    ConfigureOrgSsoConnectionUseCase,
    SetOrgSsoEnabledUseCase,
    SetOrgSsoJitProvisioningUseCase,
    GetOrgSsoConnectionUseCase,
  ],
})
export class SsoModule {}
