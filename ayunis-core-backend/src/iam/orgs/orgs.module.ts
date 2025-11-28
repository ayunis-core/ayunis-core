import { Module } from '@nestjs/common';
import { OrgsRepository } from './application/ports/orgs.repository';
import { LocalOrgsRepository } from './infrastructure/repositories/local/local-orgs.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrgRecord } from './infrastructure/repositories/local/schema/org.record';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

// Import use cases
import { FindOrgByIdUseCase } from './application/use-cases/find-org-by-id/find-org-by-id.use-case';
import { CreateOrgUseCase } from './application/use-cases/create-org/create-org.use-case';
import { UpdateOrgUseCase } from './application/use-cases/update-org/update-org.use-case';
import { DeleteOrgUseCase } from './application/use-cases/delete-org/delete-org.use-case';
import { FindAllOrgIdsUseCase } from './application/use-cases/find-all-org-ids/find-all-org-ids.use-case';
import { SuperAdminGetAllOrgsUseCase } from './application/use-cases/super-admin-get-all-orgs/super-admin-get-all-orgs.use-case';
import { SuperAdminOrgsController } from './presenters/http/super-admin-orgs.controller';
import { SuperAdminOrgResponseDtoMapper } from './presenters/http/mappers/super-admin-org-response-dto.mapper';

@Module({
  imports: [TypeOrmModule.forFeature([OrgRecord])],
  controllers: [SuperAdminOrgsController],
  providers: [
    {
      provide: OrgsRepository,
      useFactory: (orgRepository: Repository<OrgRecord>) => {
        return new LocalOrgsRepository(orgRepository);
      },
      inject: [getRepositoryToken(OrgRecord)],
    },
    // Use cases
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
