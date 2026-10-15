import type { OrgSkill } from './org-skill.entity';
import type { PersonalSkill } from './personal-skill.entity';
import type { TeamSkill } from './team-skill.entity';
import type { WorkspaceSkill } from './workspace-skill.entity';

export type CollectiveSkill = TeamSkill | OrgSkill;

export type Skill = PersonalSkill | WorkspaceSkill | CollectiveSkill;
