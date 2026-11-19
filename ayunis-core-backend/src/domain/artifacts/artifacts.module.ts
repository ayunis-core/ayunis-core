import { forwardRef, Module } from '@nestjs/common';
import { ArtifactsController } from './presenters/http/artifacts.controller';
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

// Use cases
import { CreateArtifactUseCase } from './application/use-cases/create-artifact/create-artifact.use-case';
import { UpdateArtifactUseCase } from './application/use-cases/update-artifact/update-artifact.use-case';
import { FindArtifactsByThreadUseCase } from './application/use-cases/find-artifacts-by-thread/find-artifacts-by-thread.use-case';
import { FindArtifactsByWorkspaceUseCase } from './application/use-cases/find-artifacts-by-workspace/find-artifacts-by-workspace.use-case';
import { FindArtifactWithVersionsUseCase } from './application/use-cases/find-artifact-with-versions/find-artifact-with-versions.use-case';
import { RevertArtifactUseCase } from './application/use-cases/revert-artifact/revert-artifact.use-case';
import { ExportArtifactUseCase } from './application/use-cases/export-artifact/export-artifact.use-case';
import { ApplyEditsToArtifactUseCase } from './application/use-cases/apply-edits-to-artifact/apply-edits-to-artifact.use-case';
import { UserContentMaskingService } from './application/services/user-content-masking.service';

@Module({
  imports: [
    LocalArtifactsRepositoryModule,
    DocumentExportModule,
    forwardRef(() => ThreadsModule),
    LetterheadsModule,
    StorageModule,
    ThreadPiiMasksModule,
    WorkspacesModule,
  ],
  controllers: [ArtifactsController],
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
    RevertArtifactUseCase,
    ExportArtifactUseCase,
    // Services
    UserContentMaskingService,
    // Mappers
    ArtifactDtoMapper,
  ],
  exports: [
    FindArtifactsByThreadUseCase,
    FindArtifactsByWorkspaceUseCase,
    FindArtifactWithVersionsUseCase,
    CreateArtifactUseCase,
    UpdateArtifactUseCase,
    ApplyEditsToArtifactUseCase,
  ],
})
export class ArtifactsModule {}
