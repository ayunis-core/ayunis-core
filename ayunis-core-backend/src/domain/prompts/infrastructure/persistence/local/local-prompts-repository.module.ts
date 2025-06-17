import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PromptRecord } from './schema/prompt.record';
import { LocalPromptsRepository } from './local-prompts.repository';
import { PromptMapper } from './mappers/prompt.mapper';

@Module({
  imports: [TypeOrmModule.forFeature([PromptRecord])],
  providers: [LocalPromptsRepository, PromptMapper],
  exports: [LocalPromptsRepository],
})
export class LocalPromptsRepositoryModule {}
