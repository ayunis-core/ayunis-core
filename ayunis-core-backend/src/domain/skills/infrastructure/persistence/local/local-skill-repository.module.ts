import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LocalSkillRepository } from './local-skill.repository';
import { SkillRecord } from './schema/skill.record';
import { SkillActivationRecord } from './schema/skill-activation.record';
import { SkillMapper } from './mappers/skill.mapper';

@Module({
  imports: [TypeOrmModule.forFeature([SkillRecord, SkillActivationRecord])],
  providers: [SkillMapper, LocalSkillRepository],
  exports: [LocalSkillRepository, SkillMapper],
})
export class LocalSkillRepositoryModule {}
