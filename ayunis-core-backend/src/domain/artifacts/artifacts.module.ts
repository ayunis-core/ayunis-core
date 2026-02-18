import { Module } from '@nestjs/common';
import { ArtifactsController } from './presenters/http/artifacts.controller';
import { ArtifactsRepository } from './application/ports/artifacts-repository.port';
import { DocumentExportPort } from './application/ports/document-export.port';
import { LocalArtifactsRepositoryModule } from './infrastructure/persistence/local/local-artifacts-repository.module';
import { LocalArtifactsRepository } from './infrastructure/persistence/local/local-artifacts.repository';
import { HtmlDocumentExportService } from './infrastructure/export/html-document-export.service';
import { ArtifactDtoMapper } from './presenters/http/mappers/artifact-dto.mapper';

// Use cases
import { CreateArtifactUseCase } from './application/use-cases/create-artifact/create-artifact.use-case';
import { UpdateArtifactUseCase } from './application/use-cases/update-artifact/update-artifact.use-case';
import { FindArtifactsByThreadUseCase } from './application/use-cases/find-artifacts-by-thread/find-artifacts-by-thread.use-case';
import { FindArtifactWithVersionsUseCase } from './application/use-cases/find-artifact-with-versions/find-artifact-with-versions.use-case';
import { RevertArtifactUseCase } from './application/use-cases/revert-artifact/revert-artifact.use-case';
import { ExportArtifactUseCase } from './application/use-cases/export-artifact/export-artifact.use-case';

@Module({
  imports: [LocalArtifactsRepositoryModule],
  controllers: [ArtifactsController],
  providers: [
    {
      provide: ArtifactsRepository,
      useExisting: LocalArtifactsRepository,
    },
    {
      provide: DocumentExportPort,
      useClass: HtmlDocumentExportService,
    },
    // Use cases
    CreateArtifactUseCase,
    UpdateArtifactUseCase,
    FindArtifactsByThreadUseCase,
    FindArtifactWithVersionsUseCase,
    RevertArtifactUseCase,
    ExportArtifactUseCase,
    // Mappers
    ArtifactDtoMapper,
  ],
  exports: [
    FindArtifactsByThreadUseCase,
    FindArtifactWithVersionsUseCase,
    CreateArtifactUseCase,
    UpdateArtifactUseCase,
  ],
})
export class ArtifactsModule {}
