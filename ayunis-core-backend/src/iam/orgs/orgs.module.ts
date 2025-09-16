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
import { FindOrgByUserIdUseCase } from './application/use-cases/find-org-by-user-id/find-org-by-user-id.use-case';
import { FindAllOrgIdsUseCase } from './application/use-cases/find-all-org-ids/find-all-org-ids.use-case';

@Module({
  imports: [TypeOrmModule.forFeature([OrgRecord])],
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
    FindOrgByUserIdUseCase,
    CreateOrgUseCase,
    UpdateOrgUseCase,
    DeleteOrgUseCase,
    FindAllOrgIdsUseCase,
  ],
  exports: [
    FindOrgByIdUseCase,
    FindOrgByUserIdUseCase,
    CreateOrgUseCase,
    UpdateOrgUseCase,
    DeleteOrgUseCase,
    FindAllOrgIdsUseCase,
    OrgsRepository, // Export repository for seeding
  ],
})
export class OrgsModule {}
