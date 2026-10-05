import { AssertCachedOrgActiveUseCase } from 'src/iam/orgs/application/use-cases/assert-cached-org-active/assert-cached-org-active.use-case';
import { OrgAuthenticationStateCacheService } from 'src/iam/orgs/application/services/org-authentication-state-cache.service';
import { SuperAdminDeleteOrgUseCase } from 'src/iam/orgs/application/use-cases/super-admin-delete-org/super-admin-delete-org.use-case';
import { SuperAdminOrgLifecycleController } from 'src/iam/orgs/presenters/http/super-admin-org-lifecycle.controller';
import { SessionsModule } from 'src/iam/sessions/sessions.module';
import { AssertOrgActiveUseCase } from 'src/iam/orgs/application/use-cases/assert-org-active/assert-org-active.use-case';
import { AdmitOrgProcessingUseCase } from 'src/iam/orgs/application/use-cases/admit-org-processing/admit-org-processing.use-case';
import { SetOrgArchivedUseCase } from 'src/iam/orgs/application/use-cases/set-org-archived/set-org-archived.use-case';
import { Module } from '@nestjs/common';
import { OrgsRepository } from './application/ports/orgs.repository';
import { LocalOrgsRepository } from './infrastructure/repositories/local/local-orgs.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrgRecord } from './infrastructure/repositories/local/schema/org.record';
// Import use cases
import { FindOrgByIdUseCase } from './application/use-cases/find-org-by-id/find-org-by-id.use-case';
import { CreateOrgUseCase } from './application/use-cases/create-org/create-org.use-case';
import { UpdateOrgUseCase } from './application/use-cases/update-org/update-org.use-case';
import { DeleteOrgUseCase } from './application/use-cases/delete-org/delete-org.use-case';
import { FindAllOrgIdsUseCase } from './application/use-cases/find-all-org-ids/find-all-org-ids.use-case';
import { SuperAdminGetAllOrgsUseCase } from './application/use-cases/super-admin-get-all-orgs/super-admin-get-all-orgs.use-case';
import { SuperAdminOrgsController } from './presenters/http/super-admin-orgs.controller';
import { SuperAdminOrgResponseDtoMapper } from './presenters/http/mappers/super-admin-org-response-dto.mapper';
import { PermissionsModule } from 'src/iam/permissions/permissions.module';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';

@Module({
  imports: [
    TypeOrmModule.forFeature([OrgRecord]),
    PermissionsModule,
    SessionsModule,
  ],
  controllers: [SuperAdminOrgsController, SuperAdminOrgLifecycleController],
  providers: [
    {
      provide: OrgsRepository,
      useFactory: (txHost: TransactionHost<TransactionalAdapterTypeOrm>) => {
        return new LocalOrgsRepository(txHost);
      },
      inject: [TransactionHost],
    },
    OrgAuthenticationStateCacheService,
    // Use cases
    AssertOrgActiveUseCase,
    AdmitOrgProcessingUseCase,
    AssertCachedOrgActiveUseCase,
    SetOrgArchivedUseCase,
    SuperAdminDeleteOrgUseCase,
    FindOrgByIdUseCase,
    CreateOrgUseCase,
    UpdateOrgUseCase,
    DeleteOrgUseCase,
    FindAllOrgIdsUseCase,
    SuperAdminGetAllOrgsUseCase,
    // Mappers
    SuperAdminOrgResponseDtoMapper,
  ],
  exports: [
    AssertOrgActiveUseCase,
    AdmitOrgProcessingUseCase,
    AssertCachedOrgActiveUseCase,
    SetOrgArchivedUseCase,
    SuperAdminDeleteOrgUseCase,
    FindOrgByIdUseCase,
    CreateOrgUseCase,
    UpdateOrgUseCase,
    DeleteOrgUseCase,
    FindAllOrgIdsUseCase,
    SuperAdminGetAllOrgsUseCase,
    OrgsRepository, // Export repository for seeding
  ],
})
export class OrgsModule {}
