import { ChildEntity } from 'typeorm';
import { SkillTemplateRecord } from './skill-template.record';
import { DistributionMode } from '../../../../domain/distribution-mode.enum';

@ChildEntity(DistributionMode.PRE_CREATED_COPY)
export class PreCreatedCopySkillTemplateRecord extends SkillTemplateRecord {}
