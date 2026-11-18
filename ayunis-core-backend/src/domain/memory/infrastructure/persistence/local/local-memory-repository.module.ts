import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MemoryRepository } from 'src/domain/memory/application/ports/memory.repository';
import { MemoryEntryRecord } from './schema/memory-entry.record';
import { MemoryEntryMapper } from './mappers/memory-entry.mapper';
import { LocalMemoryRepository } from './local-memory.repository';

@Module({
  imports: [TypeOrmModule.forFeature([MemoryEntryRecord])],
  providers: [
    LocalMemoryRepository,
    MemoryEntryMapper,
    {
      provide: MemoryRepository,
      useClass: LocalMemoryRepository,
    },
  ],
  exports: [MemoryRepository],
})
export class LocalMemoryRepositoryModule {}
