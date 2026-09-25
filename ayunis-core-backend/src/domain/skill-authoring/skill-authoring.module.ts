import { Module } from '@nestjs/common';
import { ModelsModule } from 'src/domain/models/models.module';
import { RunsModule } from 'src/domain/runs/runs.module';
import { SkillTextModelResolver } from './application/services/skill-text-model-resolver.service';
import { ImproveSkillTextUseCase } from './application/use-cases/improve-skill-text/improve-skill-text.use-case';
import { SkillAuthoringController } from './presenters/http/skill-authoring.controller';

@Module({
  imports: [ModelsModule, RunsModule],
  controllers: [SkillAuthoringController],
  providers: [SkillTextModelResolver, ImproveSkillTextUseCase],
})
export class SkillAuthoringModule {}
