import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserSystemPromptRecord } from './schema/user-system-prompt.record';
import { UserSystemPromptMapper } from './mappers/user-system-prompt.mapper';
import { LocalUserSystemPromptsRepository } from './local-user-system-prompts.repository';
import { UserSystemPromptsRepository } from '../../../application/ports/user-system-prompts.repository';

@Module({
  imports: [TypeOrmModule.forFeature([UserSystemPromptRecord])],
  providers: [
    LocalUserSystemPromptsRepository,
    UserSystemPromptMapper,
    {
      provide: UserSystemPromptsRepository,
      useClass: LocalUserSystemPromptsRepository,
    },
  ],
  exports: [UserSystemPromptsRepository],
})
export class LocalUserSystemPromptsRepositoryModule {}
