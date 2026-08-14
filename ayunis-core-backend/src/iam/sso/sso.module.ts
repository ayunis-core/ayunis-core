import { type DynamicModule, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrgsModule } from 'src/iam/orgs/orgs.module';
import { InvitesModule } from 'src/iam/invites/invites.module';
import { SubscriptionsModule } from 'src/iam/subscriptions/subscriptions.module';
import { UsersModule } from 'src/iam/users/users.module';
import { FederatedIdentitiesRepository } from 'src/iam/sso/application/ports/federated-identities.repository';
import { OidcBrokerClient } from 'src/iam/sso/application/ports/oidc-broker.client';
import { OrgSsoConnectionsRepository } from 'src/iam/sso/application/ports/org-sso-connections.repository';
import { SsoLoginTransactionEncryptionPort } from 'src/iam/sso/application/ports/sso-login-transaction-encryption.port';
import { SsoLoginTransactionsRepository } from 'src/iam/sso/application/ports/sso-login-transactions.repository';
import { CompleteOrgSsoLoginUseCase } from 'src/iam/sso/application/use-cases/complete-org-sso-login/complete-org-sso-login.use-case';
import { ConfigureOrgSsoConnectionUseCase } from 'src/iam/sso/application/use-cases/configure-org-sso-connection/configure-org-sso-connection.use-case';
import { DiscoverOrgSsoUseCase } from 'src/iam/sso/application/use-cases/discover-org-sso/discover-org-sso.use-case';
import { GetOrgSsoConnectionUseCase } from 'src/iam/sso/application/use-cases/get-org-sso-connection/get-org-sso-connection.use-case';
import { SetOrgSsoEnabledUseCase } from 'src/iam/sso/application/use-cases/set-org-sso-enabled/set-org-sso-enabled.use-case';
import { SetOrgSsoJitProvisioningUseCase } from 'src/iam/sso/application/use-cases/set-org-sso-jit-provisioning/set-org-sso-jit-provisioning.use-case';
import { StartOrgSsoLoginUseCase } from 'src/iam/sso/application/use-cases/start-org-sso-login/start-org-sso-login.use-case';
import { SsoLoginTransactionEncryptionService } from 'src/iam/sso/infrastructure/encryption/sso-login-transaction-encryption.service';
import { ZitadelOidcBrokerClient } from 'src/iam/sso/infrastructure/oidc/zitadel-oidc-broker.client';
import { OrgSsoConnectionMapper } from 'src/iam/sso/infrastructure/persistence/postgres/mappers/org-sso-connection.mapper';
import { PostgresOrgSsoConnectionsRepository } from 'src/iam/sso/infrastructure/persistence/postgres/org-sso-connections.repository';
import { PostgresFederatedIdentitiesRepository } from 'src/iam/sso/infrastructure/persistence/postgres/federated-identities.repository';
import { FederatedIdentityMapper } from 'src/iam/sso/infrastructure/persistence/postgres/mappers/federated-identity.mapper';
import { FederatedIdentityRecord } from 'src/iam/sso/infrastructure/persistence/postgres/schema/federated-identity.record';
import { OrgSsoConnectionRecord } from 'src/iam/sso/infrastructure/persistence/postgres/schema/org-sso-connection.record';
import { SsoLoginTransactionRecord } from 'src/iam/sso/infrastructure/persistence/postgres/schema/sso-login-transaction.record';
import { PostgresSsoLoginTransactionsRepository } from 'src/iam/sso/infrastructure/persistence/postgres/sso-login-transactions.repository';
import { SsoLoginTransactionCleanupTask } from 'src/iam/sso/infrastructure/tasks/sso-login-transaction-cleanup.task';
import { OrgSsoConnectionResponseDtoMapper } from 'src/iam/sso/presenters/http/mappers/org-sso-connection-response-dto.mapper';
import { SuperAdminSsoConnectionsController } from 'src/iam/sso/presenters/http/super-admin-sso-connections.controller';
import { SsoProvisioningLock } from 'src/iam/sso/application/ports/sso-provisioning-lock';
import { PostgresSsoProvisioningLock } from 'src/iam/sso/infrastructure/persistence/postgres/postgres-sso-provisioning-lock';
import { ProvisionOrgSsoUserUseCase } from 'src/iam/sso/application/use-cases/provision-org-sso-user/provision-org-sso-user.use-case';
import { CompleteSsoAuthenticationUseCase } from 'src/iam/sso/application/use-cases/complete-sso-authentication/complete-sso-authentication.use-case';
import { SsoLoginController } from 'src/iam/sso/presenters/http/sso-login.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OrgSsoConnectionRecord,
      FederatedIdentityRecord,
      SsoLoginTransactionRecord,
    ]),
    OrgsModule,
    InvitesModule,
    SubscriptionsModule,
    UsersModule,
  ],
  controllers: [SuperAdminSsoConnectionsController, SsoLoginController],
  providers: [
    OrgSsoConnectionMapper,
    FederatedIdentityMapper,
    OrgSsoConnectionResponseDtoMapper,
    {
      provide: OrgSsoConnectionsRepository,
      useClass: PostgresOrgSsoConnectionsRepository,
    },
    {
      provide: FederatedIdentitiesRepository,
      useClass: PostgresFederatedIdentitiesRepository,
    },
    {
      provide: OidcBrokerClient,
      useClass: ZitadelOidcBrokerClient,
    },
    {
      provide: SsoLoginTransactionsRepository,
      useClass: PostgresSsoLoginTransactionsRepository,
    },
    {
      provide: SsoLoginTransactionEncryptionPort,
      useClass: SsoLoginTransactionEncryptionService,
    },
    {
      provide: SsoProvisioningLock,
      useClass: PostgresSsoProvisioningLock,
    },
    ConfigureOrgSsoConnectionUseCase,
    SetOrgSsoEnabledUseCase,
    SetOrgSsoJitProvisioningUseCase,
    GetOrgSsoConnectionUseCase,
    DiscoverOrgSsoUseCase,
    StartOrgSsoLoginUseCase,
    CompleteOrgSsoLoginUseCase,
    ProvisionOrgSsoUserUseCase,
    CompleteSsoAuthenticationUseCase,
    SsoLoginTransactionCleanupTask,
  ],
  exports: [
    ConfigureOrgSsoConnectionUseCase,
    SetOrgSsoEnabledUseCase,
    SetOrgSsoJitProvisioningUseCase,
    GetOrgSsoConnectionUseCase,
    DiscoverOrgSsoUseCase,
    StartOrgSsoLoginUseCase,
    CompleteOrgSsoLoginUseCase,
    ProvisionOrgSsoUserUseCase,
  ],
})
export class SsoModule {
  static register(authenticationModule: DynamicModule): DynamicModule {
    return {
      module: SsoModule,
      imports: [authenticationModule],
    };
  }
}
