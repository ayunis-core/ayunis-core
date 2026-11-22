import { forwardRef, Module } from '@nestjs/common';
import { ArtifactsController } from './presenters/http/artifacts.controller';
import { ThreadArtifactsController } from './presenters/http/thread-artifacts.controller';
import { ArtifactsRepository } from './application/ports/artifacts-repository.port';
import { DocumentExportModule } from './document-export.module';
import { SpreadsheetExportPort } from './application/ports/spreadsheet-export.port';
import { LocalArtifactsRepositoryModule } from './infrastructure/persistence/local/local-artifacts-repository.module';
import { LocalArtifactsRepository } from './infrastructure/persistence/local/local-artifacts.repository';
import { XlsxSpreadsheetExportService } from './infrastructure/export/xlsx-spreadsheet-export.service';
import { ArtifactDtoMapper } from './presenters/http/mappers/artifact-dto.mapper';
import { ThreadsModule } from 'src/domain/threads/threads.module';
import { LetterheadsModule } from 'src/domain/letterheads/letterheads.module';
import { StorageModule } from 'src/domain/storage/storage.module';
import { ThreadPiiMasksModule } from 'src/domain/thread-pii-masks/thread-pii-masks.module';
import { WorkspacesModule } from 'src/domain/workspaces/workspaces.module';
import { AnonymizationSettingsModule } from 'src/domain/anonymization-settings/anonymization-settings.module';

// Use cases
import { CreateArtifactUseCase } from './application/use-cases/create-artifact/create-artifact.use-case';
import { UpdateArtifactUseCase } from './application/use-cases/update-artifact/update-artifact.use-case';
import { FindArtifactsByThreadUseCase } from './application/use-cases/find-artifacts-by-thread/find-artifacts-by-thread.use-case';
import { FindArtifactsByWorkspaceUseCase } from './application/use-cases/find-artifacts-by-workspace/find-artifacts-by-workspace.use-case';
import { FindArtifactWithVersionsUseCase } from './application/use-cases/find-artifact-with-versions/find-artifact-with-versions.use-case';
import { RevertArtifactUseCase } from './application/use-cases/revert-artifact/revert-artifact.use-case';
import { ExportArtifactUseCase } from './application/use-cases/export-artifact/export-artifact.use-case';
import { ApplyEditsToArtifactUseCase } from './application/use-cases/apply-edits-to-artifact/apply-edits-to-artifact.use-case';
import { ReadArtifactInRunUseCase } from './application/use-cases/read-artifact-in-run/read-artifact-in-run.use-case';
import { FindArtifactsForRunUseCase } from './application/use-cases/find-artifacts-for-run/find-artifacts-for-run.use-case';
import { DeleteThreadLinksOutsideScopeUseCase } from './application/use-cases/delete-thread-links-outside-scope/delete-thread-links-outside-scope.use-case';
import { FindPersonalArtifactsUseCase } from './application/use-cases/find-personal-artifacts/find-personal-artifacts.use-case';
import { DeleteArtifactUseCase } from './application/use-cases/delete-artifact/delete-artifact.use-case';
import { AttachArtifactToThreadUseCase } from './application/use-cases/attach-artifact-to-thread/attach-artifact-to-thread.use-case';
import { UserContentMaskingService } from './application/services/user-content-masking.service';
import { ArtifactPlaceholdersService } from './application/services/artifact-placeholders.service';
import { ArtifactMaskAllocationLock } from './application/services/artifact-mask-allocation-lock.service';

@Module({
  imports: [
    LocalArtifactsRepositoryModule,
    DocumentExportModule,
    forwardRef(() => ThreadsModule),
    LetterheadsModule,
    StorageModule,
    ThreadPiiMasksModule,
    AnonymizationSettingsModule,
    WorkspacesModule,
  ],
  controllers: [ArtifactsController, ThreadArtifactsController],
  providers: [
    {
      provide: ArtifactsRepository,
      useExisting: LocalArtifactsRepository,
    },
    {
      provide: SpreadsheetExportPort,
      useClass: XlsxSpreadsheetExportService,
    },
    // Use cases
    CreateArtifactUseCase,
    UpdateArtifactUseCase,
    ApplyEditsToArtifactUseCase,
    FindArtifactsByThreadUseCase,
    FindArtifactsByWorkspaceUseCase,
    FindArtifactWithVersionsUseCase,
    ReadArtifactInRunUseCase,
    FindArtifactsForRunUseCase,
    RevertArtifactUseCase,
    ExportArtifactUseCase,
    DeleteThreadLinksOutsideScopeUseCase,
    FindPersonalArtifactsUseCase,
    DeleteArtifactUseCase,
    AttachArtifactToThreadUseCase,
    // Services
    UserContentMaskingService,
    ArtifactPlaceholdersService,
    ArtifactMaskAllocationLock,
    // Mappers
    ArtifactDtoMapper,
  ],
  exports: [
    FindArtifactsByThreadUseCase,
    FindArtifactsByWorkspaceUseCase,
    FindArtifactWithVersionsUseCase,
    ReadArtifactInRunUseCase,
    FindArtifactsForRunUseCase,
    CreateArtifactUseCase,
    UpdateArtifactUseCase,
    ApplyEditsToArtifactUseCase,
    DeleteThreadLinksOutsideScopeUseCase,
  ],
})
export class ArtifactsModule {}
