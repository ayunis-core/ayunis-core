import { Module } from '@nestjs/common';
import { ContextModule } from 'src/common/context/context.module';
import { WorkspacesModule } from 'src/domain/workspaces/workspaces.module';
import { TeamsApplicationModule } from 'src/iam/teams/teams-application.module';
import { UsersModule } from 'src/iam/users/users.module';
import { RecordingsOrgDeletionRequestedListener } from './application/listeners/org-deletion-requested.listener';
import { RecordingsTeamDeletionRequestedListener } from './application/listeners/team-deletion-requested.listener';
import { RecordingsUserDeletionRequestedListener } from './application/listeners/user-deletion-requested.listener';
import { RecordingsWorkspaceDeletionRequestedListener } from './application/listeners/workspace-deletion-requested.listener';
import { CollectiveRecordingAccessService } from './application/services/collective-recording-access.service';
import { RecordingAccessService } from './application/services/recording-access.service';
import { RecordingCleanupService } from './application/services/recording-cleanup.service';
import { RecordingCreatorNameService } from './application/services/recording-creator-name.service';
import { ChangeRecordingOwnerUseCase } from './application/use-cases/change-recording-owner/change-recording-owner.use-case';
import { CreateRecordingUseCase } from './application/use-cases/create-recording/create-recording.use-case';
import { DeleteRecordingUseCase } from './application/use-cases/delete-recording/delete-recording.use-case';
import { FindRecordingUseCase } from './application/use-cases/find-recording/find-recording.use-case';
import { ListRecordingsUseCase } from './application/use-cases/list-recordings/list-recordings.use-case';
import { RenameRecordingUseCase } from './application/use-cases/rename-recording/rename-recording.use-case';
import { LocalRecordingRepositoryModule } from './infrastructure/persistence/local/local-recording-repository.module';
import { RecordingDtoMapper } from './presenters/http/mappers/recording-dto.mapper';
import { RecordingsController } from './presenters/http/recordings.controller';

@Module({
  imports: [
    LocalRecordingRepositoryModule,
    ContextModule,
    TeamsApplicationModule,
    UsersModule,
    WorkspacesModule,
  ],
  providers: [
    CollectiveRecordingAccessService,
    RecordingAccessService,
    RecordingCleanupService,
    RecordingCreatorNameService,
    CreateRecordingUseCase,
    ListRecordingsUseCase,
    FindRecordingUseCase,
    RenameRecordingUseCase,
    ChangeRecordingOwnerUseCase,
    DeleteRecordingUseCase,
    RecordingDtoMapper,
    RecordingsUserDeletionRequestedListener,
    RecordingsTeamDeletionRequestedListener,
    RecordingsWorkspaceDeletionRequestedListener,
    RecordingsOrgDeletionRequestedListener,
  ],
  controllers: [RecordingsController],
})
export class RecordingsModule {}
