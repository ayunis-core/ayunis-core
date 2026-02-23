import type { UUID } from 'crypto';
import type { Thread } from 'src/domain/threads/domain/thread.entity';
import type { Tool } from 'src/domain/tools/domain/tool.entity';
import type { LanguageModel } from 'src/domain/models/domain/models/language.model';
import type {
  RunUserInput,
  RunToolResultInput,
} from '../../../domain/run-input.entity';
import type { Agent } from 'src/domain/agents/domain/agent.entity';
import type { Skill } from 'src/domain/skills/domain/skill.entity';

export interface RunParams {
  thread: Thread;
  tools: Tool[];
  model: LanguageModel;
  input: RunUserInput | RunToolResultInput;
  instructions?: string;
  streaming?: boolean;
  orgId: UUID;
  isAnonymous: boolean;
  agent?: Agent;
  activeSkills: Skill[];
  skillId?: UUID;
  skillInstructions?: string;
  activatedSkillName?: string;
}
