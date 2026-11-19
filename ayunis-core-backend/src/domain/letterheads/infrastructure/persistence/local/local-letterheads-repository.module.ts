import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LetterheadRecord } from './schema/letterhead.record';
import { LocalLetterheadsRepository } from './local-letterheads.repository';
import { LetterheadMapper } from './mappers/letterhead.mapper';

import { DocumentDefaultsRecord } from './schema/document-defaults.record';
import { LocalDocumentDefaultsRepository } from './local-document-defaults.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([LetterheadRecord, DocumentDefaultsRecord]),
  ],
  providers: [
    LocalLetterheadsRepository,
    LetterheadMapper,
    LocalDocumentDefaultsRepository,
  ],
  exports: [LocalLetterheadsRepository, LocalDocumentDefaultsRepository],
})
export class LocalLetterheadsRepositoryModule {}
