import { Module } from '@nestjs/common';
import { OrgsRepository } from './application/ports/orgs.repository';
import { CloudOrgsRepository } from './infrastructure/repositories/cloud/cloud-orgs.repository';
import { LocalOrgsRepository } from './infrastructure/repositories/local/local-orgs.repository';
import { ConfigService } from '@nestjs/config';
import { AuthProvider } from 'src/config/authentication.config';
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
      useFactory: (
        configService: ConfigService,
        orgRepository: Repository<OrgRecord>,
      ) => {
        return configService.get('auth.provider') === AuthProvider.CLOUD
          ? new CloudOrgsRepository()
          : new LocalOrgsRepository(orgRepository);
      },
      inject: [ConfigService, getRepositoryToken(OrgRecord)],
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
  ],
})
export class OrgsModule {}
