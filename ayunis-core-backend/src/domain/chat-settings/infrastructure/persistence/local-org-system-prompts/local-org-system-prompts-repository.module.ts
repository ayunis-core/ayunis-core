import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrgSystemPromptRecord } from './schema/org-system-prompt.record';
import { OrgSystemPromptMapper } from './mappers/org-system-prompt.mapper';
import { LocalOrgSystemPromptsRepository } from './local-org-system-prompts.repository';
import { OrgSystemPromptsRepository } from 'src/domain/chat-settings/application/ports/org-system-prompts.repository';

@Module({
  imports: [TypeOrmModule.forFeature([OrgSystemPromptRecord])],
  providers: [
    LocalOrgSystemPromptsRepository,
    OrgSystemPromptMapper,
    {
      provide: OrgSystemPromptsRepository,
      useClass: LocalOrgSystemPromptsRepository,
    },
  ],
  exports: [OrgSystemPromptsRepository],
})
export class LocalOrgSystemPromptsRepositoryModule {}
