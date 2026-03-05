import { ChildEntity } from 'typeorm';
import { SkillTemplateRecord } from './skill-template.record';
import { DistributionMode } from '../../../../domain/distribution-mode.enum';

@ChildEntity(DistributionMode.ALWAYS_ON)
export class AlwaysOnSkillTemplateRecord extends SkillTemplateRecord {}
