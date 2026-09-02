import type { Tool as RuntimeTool } from '@ayunis/agent-runtime';
import type { UUID } from 'crypto';
import type { LanguageModel } from 'src/domain/models/domain/models/language.model';
import type { Skill } from 'src/domain/skills/domain/skill.entity';
import type { Thread } from 'src/domain/threads/domain/thread.entity';
import type { Tool as BackendTool } from 'src/domain/tools/domain/tool.entity';
import type { RuntimeToolIntegrationRegistry } from 'src/domain/runs/application/agent-runtime/runtime-tool-integration.registry';

export interface PreparedTools {
  tools: RuntimeTool[];
  backendTools: BackendTool[];
  toolIntegrations: RuntimeToolIntegrationRegistry;
}

export interface PreparedRun extends PreparedTools {
  thread: Thread;
  model: LanguageModel;
  orgId: UUID;
  userId: UUID;
  isAnonymous: boolean;
  instructions: string;
  activeSkills: Skill[];
  skillInstructions?: string;
  activatedSkillName?: string;
}
