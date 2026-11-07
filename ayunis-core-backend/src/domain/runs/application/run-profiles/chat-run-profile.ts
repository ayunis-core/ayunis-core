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
import { LegalReferencesCapability } from 'src/domain/runs/application/run-capabilities/capabilities/legal-references.capability';
import { MarketplaceCapability } from 'src/domain/runs/application/run-capabilities/capabilities/marketplace.capability';
import { McpCapability } from 'src/domain/runs/application/run-capabilities/capabilities/mcp.capability';
import { SkillsCapability } from 'src/domain/runs/application/run-capabilities/capabilities/skills.capability';
import { ThreadSourcesCapability } from 'src/domain/runs/application/run-capabilities/capabilities/thread-sources.capability';
import { WorkspaceInstructionsCapability } from 'src/domain/runs/application/run-capabilities/capabilities/workspace-instructions.capability';
import { NotificationContextCapability } from 'src/domain/runs/application/run-capabilities/capabilities/notification-context.capability';
import {
  DONE_WHEN_MODEL_STOPS,
  type RunCompletionPolicy,
  type RunProfile,
} from './run-profile';

const CHAT_PREAMBLE = `You are an AI assistant powered by Ayunis Core, an open-source AI gateway platform designed for public administrations.

<application_details>
Ayunis Core is an AI platform that enables intelligent conversations, customizable skills, and extensible tool integration. It is built for public sector organizations that need sovereign AI solutions with full control over data, models, and integrations.
</application_details>`;

/** Interactive chat with a user who reads the answers as they stream. */
@Injectable()
export class ChatRunProfile implements RunProfile {
  readonly id = 'chat';
  readonly preamble = CHAT_PREAMBLE;
  readonly closing = 'You are now ready to assist the user.';
  readonly completionPolicy: RunCompletionPolicy = DONE_WHEN_MODEL_STOPS;
  readonly maxIterations = 50;
  readonly capabilities: readonly RunCapability[];

  constructor(
    dateTime: DateTimeCapability,
    dataHandling: DataHandlingCapability,
    anonymization: AnonymizationCapability,
    behavior: BehaviorCapability,
    legalReferences: LegalReferencesCapability,
    customInstructions: CustomInstructionsCapability,
    codeExecution: CodeExecutionCapability,
    emailCalendar: EmailCalendarCapability,
    filesChartsMap: FilesChartsMapCapability,
    artifacts: ArtifactsCapability,
    skills: SkillsCapability,
    internet: InternetCapability,
    marketplace: MarketplaceCapability,
    imageGeneration: ImageGenerationCapability,
    threadSources: ThreadSourcesCapability,
    knowledgeBases: KnowledgeBasesCapability,
    notificationContext: NotificationContextCapability,
    workspaceInstructions: WorkspaceInstructionsCapability,
    mcp: McpCapability,
  ) {
    this.capabilities = [
      dateTime,
      dataHandling,
      anonymization,
      behavior,
      legalReferences,
      customInstructions,
      codeExecution,
      emailCalendar,
      filesChartsMap,
      artifacts,
      skills,
      internet,
      marketplace,
      imageGeneration,
      threadSources,
      knowledgeBases,
      notificationContext,
      workspaceInstructions,
      mcp,
    ];
  }
}
