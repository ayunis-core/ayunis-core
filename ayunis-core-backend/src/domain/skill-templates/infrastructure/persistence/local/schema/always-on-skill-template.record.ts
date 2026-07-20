import { ChildEntity } from 'typeorm';
import { SkillTemplateRecord } from './skill-template.record';
import { DistributionMode } from 'src/domain/skill-templates/domain/distribution-mode.enum';

@ChildEntity(DistributionMode.ALWAYS_ON)
export class AlwaysOnSkillTemplateRecord extends SkillTemplateRecord {}
