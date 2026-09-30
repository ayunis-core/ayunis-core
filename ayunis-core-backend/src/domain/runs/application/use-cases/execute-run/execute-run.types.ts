import type { Skill } from 'src/domain/skills/domain/skill';
import type { Tool as RuntimeTool } from '@ayunis/agent-runtime';
import type { UUID } from 'crypto';
import type { LanguageModel } from 'src/domain/models/domain/models/language.model';

import type { Thread } from 'src/domain/threads/domain/thread.entity';
import type { Tool as BackendTool } from 'src/domain/tools/domain/tool.entity';
import type { Message } from 'src/domain/messages/domain/message.entity';
import type { ThreadPiiMask } from 'src/domain/thread-pii-masks/domain/thread-pii-mask.entity';
import type { RunToolResultInput } from 'src/domain/runs/domain/run-input.entity';
import type { RuntimeToolIntegrationRegistry } from 'src/domain/runs/application/agent-runtime/runtime-tool-integration.registry';

export interface SeededInput {
  message: Message;
  masks: ThreadPiiMask[] | null;
}

export interface PreparedToolResultInput {
  input: RunToolResultInput;
  masks: ThreadPiiMask[] | null;
}

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
