import { Module } from '@nestjs/common';
import { ChatSettingsModule } from 'src/domain/chat-settings/chat-settings.module';
import { LocalMemoryRepositoryModule } from './infrastructure/persistence/local/local-memory-repository.module';
import { FindUserMemoryUseCase } from './application/use-cases/find-user-memory/find-user-memory.use-case';
import { GetMemoryEntryUseCase } from './application/use-cases/get-memory-entry/get-memory-entry.use-case';
import { UpsertMemoryEntryUseCase } from './application/use-cases/upsert-memory-entry/upsert-memory-entry.use-case';
import { DeleteMemoryEntryUseCase } from './application/use-cases/delete-memory-entry/delete-memory-entry.use-case';
import { ClearUserMemoryUseCase } from './application/use-cases/clear-user-memory/clear-user-memory.use-case';
import { MemoryController } from './presenters/http/memory.controller';
import { MemoryEntryDtoMapper } from './presenters/http/mappers/memory-entry.mapper';
import { MemoryAvailabilityService } from './application/services/memory-availability.service';

@Module({
  imports: [LocalMemoryRepositoryModule, ChatSettingsModule],
  controllers: [MemoryController],
  providers: [
    FindUserMemoryUseCase,
    GetMemoryEntryUseCase,
    UpsertMemoryEntryUseCase,
    DeleteMemoryEntryUseCase,
    ClearUserMemoryUseCase,
    MemoryEntryDtoMapper,
    MemoryAvailabilityService,
  ],
  exports: [
    FindUserMemoryUseCase,
    GetMemoryEntryUseCase,
    UpsertMemoryEntryUseCase,
    DeleteMemoryEntryUseCase,
  ],
})
export class MemoryModule {}
