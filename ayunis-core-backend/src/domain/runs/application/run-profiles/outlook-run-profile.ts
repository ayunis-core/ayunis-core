import { Injectable } from '@nestjs/common';
import type { RunCapability } from 'src/domain/runs/application/run-capabilities/run-capability';
import { AnonymizationCapability } from 'src/domain/runs/application/run-capabilities/capabilities/anonymization.capability';
import { BehaviorCapability } from 'src/domain/runs/application/run-capabilities/capabilities/behavior.capability';
import { CustomInstructionsCapability } from 'src/domain/runs/application/run-capabilities/capabilities/custom-instructions.capability';
import { DataHandlingCapability } from 'src/domain/runs/application/run-capabilities/capabilities/data-handling.capability';
import { DateTimeCapability } from 'src/domain/runs/application/run-capabilities/capabilities/date-time.capability';
import { InternetCapability } from 'src/domain/runs/application/run-capabilities/capabilities/internet.capability';
import { KnowledgeBasesCapability } from 'src/domain/runs/application/run-capabilities/capabilities/knowledge-bases.capability';
import { RecordingsCapability } from 'src/domain/runs/application/run-capabilities/capabilities/recordings.capability';
import { LegalReferencesCapability } from 'src/domain/runs/application/run-capabilities/capabilities/legal-references.capability';
import { McpCapability } from 'src/domain/runs/application/run-capabilities/capabilities/mcp.capability';
import { ReleaseNoteContextCapability } from 'src/domain/runs/application/run-capabilities/capabilities/release-note-context.capability';
import { NotificationContextCapability } from 'src/domain/runs/application/run-capabilities/capabilities/notification-context.capability';
import { OutlookAddInCapability } from 'src/domain/runs/application/run-capabilities/capabilities/outlook-add-in.capability';
import { ThreadSourcesCapability } from 'src/domain/runs/application/run-capabilities/capabilities/thread-sources.capability';
import { WorkspaceInstructionsCapability } from 'src/domain/runs/application/run-capabilities/capabilities/workspace-instructions.capability';
import {
  AYUNIS_PREAMBLE,
  DONE_WHEN_MODEL_STOPS,
  type RunCompletionPolicy,
  type RunProfile,
} from './run-profile';

/**
 * Chat in the Outlook add-in pane. The pane renders assistant text, Outlook
 * tool cards and a confirmation prompt, and nothing else — so this profile
 * carries only capabilities whose output survives there. Artifacts, files and
 * charts, generated images, code execution, skills, routines, the marketplace
 * and the email/calendar tools are left to the web app, where their results
 * can be shown.
 */
@Injectable()
export class OutlookRunProfile implements RunProfile {
  readonly id = 'outlook';
  readonly preamble = AYUNIS_PREAMBLE;
  readonly closing = 'You are now ready to assist the user.';
  readonly completionPolicy: RunCompletionPolicy = DONE_WHEN_MODEL_STOPS;
  readonly maxIterations = 50;
  readonly asksForToolConfirmation = true;
  readonly capabilities: readonly RunCapability[];

  constructor(
    dateTime: DateTimeCapability,
    dataHandling: DataHandlingCapability,
    anonymization: AnonymizationCapability,
    behavior: BehaviorCapability,
    legalReferences: LegalReferencesCapability,
    outlookAddIn: OutlookAddInCapability,
    customInstructions: CustomInstructionsCapability,
    internet: InternetCapability,
    threadSources: ThreadSourcesCapability,
    knowledgeBases: KnowledgeBasesCapability,
    recordings: RecordingsCapability,
    notificationContext: NotificationContextCapability,
    releaseNoteContext: ReleaseNoteContextCapability,
    workspaceInstructions: WorkspaceInstructionsCapability,
    mcp: McpCapability,
  ) {
    this.capabilities = [
      dateTime,
      dataHandling,
      anonymization,
      behavior,
      legalReferences,
      outlookAddIn,
      customInstructions,
      internet,
      threadSources,
      knowledgeBases,
      recordings,
      notificationContext,
      releaseNoteContext,
      workspaceInstructions,
      mcp,
    ];
  }
}
