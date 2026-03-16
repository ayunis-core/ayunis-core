import { Module } from '@nestjs/common';
import { LetterheadsRepository } from './application/ports/letterheads-repository.port';
import { LocalLetterheadsRepositoryModule } from './infrastructure/persistence/local/local-letterheads-repository.module';
import { LocalLetterheadsRepository } from './infrastructure/persistence/local/local-letterheads.repository';

@Module({
  imports: [LocalLetterheadsRepositoryModule],
  providers: [
    {
      provide: LetterheadsRepository,
      useExisting: LocalLetterheadsRepository,
    },
  ],
})
export class LetterheadsModule {}
