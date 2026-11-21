import { Injectable } from '@nestjs/common';
import type { RunCapability } from 'src/domain/runs/application/run-capabilities/run-capability';
import { AnonymizationCapability } from 'src/domain/runs/application/run-capabilities/capabilities/anonymization.capability';
import { ArtifactsCapability } from 'src/domain/runs/application/run-capabilities/capabilities/artifacts.capability';
import { BehaviorCapability } from 'src/domain/runs/application/run-capabilities/capabilities/behavior.capability';
import { CodeExecutionCapability } from 'src/domain/runs/application/run-capabilities/capabilities/code-execution.capability';
import { CustomInstructionsCapability } from 'src/domain/runs/application/run-capabilities/capabilities/custom-instructions.capability';
import { DataHandlingCapability } from 'src/domain/runs/application/run-capabilities/capabilities/data-handling.capability';
import { DateTimeCapability } from 'src/domain/runs/application/run-capabilities/capabilities/date-time.capability';
import { EmailCalendarCapability } from 'src/domain/runs/application/run-capabilities/capabilities/email-calendar.capability';
import { FilesChartsMapCapability } from 'src/domain/runs/application/run-capabilities/capabilities/files-charts-map.capability';
import { ImageGenerationCapability } from 'src/domain/runs/application/run-capabilities/capabilities/image-generation.capability';
import { InternetCapability } from 'src/domain/runs/application/run-capabilities/capabilities/internet.capability';
import { KnowledgeBasesCapability } from 'src/domain/runs/application/run-capabilities/capabilities/knowledge-bases.capability';
import { RecordingsCapability } from 'src/domain/runs/application/run-capabilities/capabilities/recordings.capability';
import { LegalReferencesCapability } from 'src/domain/runs/application/run-capabilities/capabilities/legal-references.capability';
import { MarketplaceCapability } from 'src/domain/runs/application/run-capabilities/capabilities/marketplace.capability';
import { McpCapability } from 'src/domain/runs/application/run-capabilities/capabilities/mcp.capability';
import { SkillsCapability } from 'src/domain/runs/application/run-capabilities/capabilities/skills.capability';
import { RoutinesCapability } from 'src/domain/runs/application/run-capabilities/capabilities/routines.capability';
import { AnonymizationExceptionCapability } from 'src/domain/runs/application/run-capabilities/capabilities/anonymization-exception.capability';
import { ThreadSourcesCapability } from 'src/domain/runs/application/run-capabilities/capabilities/thread-sources.capability';
import { WorkspaceInstructionsCapability } from 'src/domain/runs/application/run-capabilities/capabilities/workspace-instructions.capability';
import { ReleaseNoteContextCapability } from 'src/domain/runs/application/run-capabilities/capabilities/release-note-context.capability';
import { NotificationContextCapability } from 'src/domain/runs/application/run-capabilities/capabilities/notification-context.capability';
import { OnboardingCapability } from 'src/domain/runs/application/run-capabilities/capabilities/onboarding.capability';
import { MemoryCapability } from 'src/domain/runs/application/run-capabilities/capabilities/memory.capability';
import { ChatHistoryCapability } from 'src/domain/runs/application/run-capabilities/capabilities/chat-history.capability';
import { AdoptionCapability } from 'src/domain/runs/application/run-capabilities/capabilities/adoption.capability';
import {
  AYUNIS_PREAMBLE,
  DONE_WHEN_MODEL_STOPS,
  type RunCompletionPolicy,
  type RunProfile,
} from './run-profile';

/** Interactive chat with a user who reads the answers as they stream. */
@Injectable()
export class ChatRunProfile implements RunProfile {
  readonly id = 'chat';
  readonly preamble = AYUNIS_PREAMBLE;
  readonly closing = 'You are now ready to assist the user.';
  readonly completionPolicy: RunCompletionPolicy = DONE_WHEN_MODEL_STOPS;
  readonly maxIterations = 50;
  readonly asksForToolConfirmation = true;

  constructor(
    private readonly dateTime: DateTimeCapability,
    private readonly dataHandling: DataHandlingCapability,
    private readonly anonymization: AnonymizationCapability,
    private readonly behavior: BehaviorCapability,
    private readonly legalReferences: LegalReferencesCapability,
    private readonly customInstructions: CustomInstructionsCapability,
    private readonly codeExecution: CodeExecutionCapability,
    private readonly emailCalendar: EmailCalendarCapability,
    private readonly filesChartsMap: FilesChartsMapCapability,
    private readonly artifacts: ArtifactsCapability,
    private readonly skills: SkillsCapability,
    private readonly routines: RoutinesCapability,
    private readonly anonymizationException: AnonymizationExceptionCapability,
    private readonly internet: InternetCapability,
    private readonly marketplace: MarketplaceCapability,
    private readonly imageGeneration: ImageGenerationCapability,
    private readonly threadSources: ThreadSourcesCapability,
    private readonly knowledgeBases: KnowledgeBasesCapability,
    private readonly recordings: RecordingsCapability,
    private readonly notificationContext: NotificationContextCapability,
    private readonly releaseNoteContext: ReleaseNoteContextCapability,
    private readonly onboarding: OnboardingCapability,
    private readonly workspaceInstructions: WorkspaceInstructionsCapability,
    private readonly adoption: AdoptionCapability,
    private readonly memory: MemoryCapability,
    private readonly chatHistory: ChatHistoryCapability,
    private readonly mcp: McpCapability,
  ) {}

  get capabilities(): readonly RunCapability[] {
    return [
      this.dateTime,
      this.dataHandling,
      this.anonymization,
      this.behavior,
      this.legalReferences,
      this.customInstructions,
      this.codeExecution,
      this.emailCalendar,
      this.filesChartsMap,
      this.artifacts,
      this.skills,
      this.routines,
      this.anonymizationException,
      this.internet,
      this.marketplace,
      this.imageGeneration,
      this.threadSources,
      this.knowledgeBases,
      this.recordings,
      this.notificationContext,
      this.releaseNoteContext,
      this.onboarding,
      this.workspaceInstructions,
      this.adoption,
      this.memory,
      this.chatHistory,
      this.mcp,
    ];
  }
}
