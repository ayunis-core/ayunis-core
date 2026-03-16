import { Module } from '@nestjs/common';
import { LetterheadsRepository } from './application/ports/letterheads-repository.port';
import { LocalLetterheadsRepositoryModule } from './infrastructure/persistence/local/local-letterheads-repository.module';
import { LocalLetterheadsRepository } from './infrastructure/persistence/local/local-letterheads.repository';
import { StorageModule } from '../storage/storage.module';
import { LetterheadPdfService } from './application/services/letterhead-pdf.service';
import { CreateLetterheadUseCase } from './application/use-cases/create-letterhead/create-letterhead.use-case';
import { FindAllLetterheadsUseCase } from './application/use-cases/find-all-letterheads/find-all-letterheads.use-case';
import { FindLetterheadUseCase } from './application/use-cases/find-letterhead/find-letterhead.use-case';
import { UpdateLetterheadUseCase } from './application/use-cases/update-letterhead/update-letterhead.use-case';
import { DeleteLetterheadUseCase } from './application/use-cases/delete-letterhead/delete-letterhead.use-case';
import { LetterheadsController } from './presenters/http/letterheads.controller';
import { LetterheadDtoMapper } from './presenters/http/mappers/letterhead-dto.mapper';

@Module({
  imports: [LocalLetterheadsRepositoryModule, StorageModule],
  controllers: [LetterheadsController],
  providers: [
    {
      provide: LetterheadsRepository,
      useExisting: LocalLetterheadsRepository,
    },
    LetterheadPdfService,
    CreateLetterheadUseCase,
    FindAllLetterheadsUseCase,
    FindLetterheadUseCase,
    UpdateLetterheadUseCase,
    DeleteLetterheadUseCase,
    LetterheadDtoMapper,
  ],
  exports: [
    LetterheadsRepository,
    CreateLetterheadUseCase,
    FindAllLetterheadsUseCase,
    FindLetterheadUseCase,
    UpdateLetterheadUseCase,
    DeleteLetterheadUseCase,
  ],
})
export class LetterheadsModule {}
