import { Module } from '@nestjs/common';
import { PermissionsModule } from 'src/iam/permissions/permissions.module';
import { TeamsModule } from 'src/iam/teams/teams.module';
import { UsersModule } from 'src/iam/users/users.module';
import { GetOwnershipViewerUseCase } from './application/use-cases/get-ownership-viewer/get-ownership-viewer.use-case';
import { DescribeCollectiveOwnersUseCase } from './application/use-cases/describe-collective-owners/describe-collective-owners.use-case';
import { ListOwnerOptionsUseCase } from './application/use-cases/list-owner-options/list-owner-options.use-case';
import { BuildOwnershipLookupUseCase } from './application/use-cases/build-ownership-lookup/build-ownership-lookup.use-case';

@Module({
  imports: [PermissionsModule, TeamsModule, UsersModule],
  providers: [
    GetOwnershipViewerUseCase,
    DescribeCollectiveOwnersUseCase,
    ListOwnerOptionsUseCase,
    BuildOwnershipLookupUseCase,
  ],
  exports: [
    BuildOwnershipLookupUseCase,
    GetOwnershipViewerUseCase,
    DescribeCollectiveOwnersUseCase,
    ListOwnerOptionsUseCase,
  ],
})
export class OwnershipModule {}
