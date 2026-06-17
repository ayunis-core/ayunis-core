import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LetterheadRecord } from './schema/letterhead.record';
import { LocalLetterheadsRepository } from './local-letterheads.repository';
import { LetterheadMapper } from './mappers/letterhead.mapper';

@Module({
  imports: [TypeOrmModule.forFeature([LetterheadRecord])],
  providers: [LocalLetterheadsRepository, LetterheadMapper],
  exports: [LocalLetterheadsRepository],
})
export class LocalLetterheadsRepositoryModule {}
