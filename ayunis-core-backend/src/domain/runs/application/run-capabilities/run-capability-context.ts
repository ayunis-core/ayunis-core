import type { UUID } from 'crypto';
import type { SkillEntry } from 'src/common/util/skill-slug';
import type { KnowledgeBaseSummary } from 'src/domain/knowledge-bases/domain/knowledge-base-summary';
import type { LanguageModel } from 'src/domain/models/domain/models/language.model';
import type { RunProfileInput } from 'src/domain/runs/application/run-profiles/run-profile-input';
import type { Source } from 'src/domain/sources/domain/source.entity';
import type { Thread } from 'src/domain/threads/domain/thread.entity';
import type { WorkspaceRunContext } from 'src/domain/workspaces/domain/workspace-run-context.entity';

export interface SkillCatalog {
  /** Advertised slug → skill name, for `activate_skill`. */
  readonly slugMap: Map<string, string>;
  /** Slug → immutable ID of editable personal and workspace skills, for `edit_skill`. */
  readonly editableSkillIds: Map<string, string>;
  readonly entries: SkillEntry[];
}

export interface RunCapabilityInput {
  readonly profile: RunProfileInput;
  readonly thread: Thread;
  readonly model: LanguageModel;
  readonly userId: UUID;
  readonly orgId: UUID;
  readonly isAnonymous: boolean;
  /** Skill activated by a quick action before this run started. */
  readonly activatedSkillName?: string;
}

/**
 * Run inputs shared by every capability of a profile. Inputs that need I/O and
 * are not used by every profile are loaded on first use and then reused.
 */
export interface RunCapabilityContext extends RunCapabilityInput {
  readonly now: Date;
  readonly workspaceContext?: WorkspaceRunContext;
  /** Thread-attached sources, deduplicated by ID. */
  readonly threadSources: readonly Source[];
  /** Thread, workspace and the user's active knowledge bases, merged by ID. */
  knowledgeBases(): Promise<KnowledgeBaseSummary[]>;
  skillCatalog(): Promise<SkillCatalog>;
}
