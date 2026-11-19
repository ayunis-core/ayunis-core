import { Module } from '@nestjs/common';
import { DocumentExportModule } from 'src/domain/artifacts/document-export.module';
import { PreviewLetterheadUseCase } from './application/use-cases/preview-letterhead/preview-letterhead.use-case';
import { LetterheadsRepository } from './application/ports/letterheads-repository.port';
import { LocalLetterheadsRepositoryModule } from './infrastructure/persistence/local/local-letterheads-repository.module';
import { LocalLetterheadsRepository } from './infrastructure/persistence/local/local-letterheads.repository';
import { StorageModule } from 'src/domain/storage/storage.module';
import { LetterheadPdfService } from './application/services/letterhead-pdf.service';
import { CreateLetterheadUseCase } from './application/use-cases/create-letterhead/create-letterhead.use-case';
import { FindAllLetterheadsUseCase } from './application/use-cases/find-all-letterheads/find-all-letterheads.use-case';
import { FindLetterheadUseCase } from './application/use-cases/find-letterhead/find-letterhead.use-case';
import { UpdateLetterheadUseCase } from './application/use-cases/update-letterhead/update-letterhead.use-case';
import { DeleteLetterheadUseCase } from './application/use-cases/delete-letterhead/delete-letterhead.use-case';
import { LetterheadsController } from './presenters/http/letterheads.controller';
import { LetterheadDtoMapper } from './presenters/http/mappers/letterhead-dto.mapper';

import { DocumentDefaultsRepository } from './application/ports/document-defaults.repository';
import { LocalDocumentDefaultsRepository } from './infrastructure/persistence/local/local-document-defaults.repository';
import { GetDocumentDefaultsUseCase } from './application/use-cases/get-document-defaults/get-document-defaults.use-case';
import { UpdateDocumentDefaultsUseCase } from './application/use-cases/update-document-defaults/update-document-defaults.use-case';
import { DocumentDefaultsController } from './presenters/http/document-defaults.controller';

@Module({
  imports: [
    LocalLetterheadsRepositoryModule,
    StorageModule,
    DocumentExportModule,
  ],
  controllers: [LetterheadsController, DocumentDefaultsController],
  providers: [
    {
      provide: LetterheadsRepository,
      useExisting: LocalLetterheadsRepository,
    },
    {
      provide: DocumentDefaultsRepository,
      useExisting: LocalDocumentDefaultsRepository,
    },
    GetDocumentDefaultsUseCase,
    UpdateDocumentDefaultsUseCase,
    LetterheadPdfService,
    PreviewLetterheadUseCase,
    CreateLetterheadUseCase,
    FindAllLetterheadsUseCase,
    FindLetterheadUseCase,
    UpdateLetterheadUseCase,
    DeleteLetterheadUseCase,
    LetterheadDtoMapper,
  ],
  exports: [
    GetDocumentDefaultsUseCase,
    LetterheadsRepository,
    CreateLetterheadUseCase,
    FindAllLetterheadsUseCase,
    FindLetterheadUseCase,
    UpdateLetterheadUseCase,
    DeleteLetterheadUseCase,
  ],
})
export class LetterheadsModule {}
