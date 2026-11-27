import { Injectable } from '@nestjs/common';
import { SURFACE_REGISTRY } from 'src/config/surface-registry';
import type { RunCapability } from 'src/domain/runs/application/run-capabilities/run-capability';
import { AnonymizationCapability } from 'src/domain/runs/application/run-capabilities/capabilities/anonymization.capability';
import { BehaviorCapability } from 'src/domain/runs/application/run-capabilities/capabilities/behavior.capability';
import { CustomInstructionsCapability } from 'src/domain/runs/application/run-capabilities/capabilities/custom-instructions.capability';
import { DataHandlingCapability } from 'src/domain/runs/application/run-capabilities/capabilities/data-handling.capability';
import { DateTimeCapability } from 'src/domain/runs/application/run-capabilities/capabilities/date-time.capability';
import { InternetCapability } from 'src/domain/runs/application/run-capabilities/capabilities/internet.capability';
import { KnowledgeBasesCapability } from 'src/domain/runs/application/run-capabilities/capabilities/knowledge-bases.capability';
import { LegalReferencesCapability } from 'src/domain/runs/application/run-capabilities/capabilities/legal-references.capability';
import { McpCapability } from 'src/domain/runs/application/run-capabilities/capabilities/mcp.capability';
import { NotificationContextCapability } from 'src/domain/runs/application/run-capabilities/capabilities/notification-context.capability';
import { OparlCapability } from 'src/domain/runs/application/run-capabilities/capabilities/oparl.capability';
import { RecordingsCapability } from 'src/domain/runs/application/run-capabilities/capabilities/recordings.capability';
import { ReleaseNoteContextCapability } from 'src/domain/runs/application/run-capabilities/capabilities/release-note-context.capability';
import { ThreadSourcesCapability } from 'src/domain/runs/application/run-capabilities/capabilities/thread-sources.capability';
import { WorkspaceInstructionsCapability } from 'src/domain/runs/application/run-capabilities/capabilities/workspace-instructions.capability';
import {
  AYUNIS_PREAMBLE,
  DONE_WHEN_MODEL_STOPS,
  type RunCompletionPolicy,
  type RunProfile,
} from './run-profile';

@Injectable()
export class ExcelRunProfile implements RunProfile {
  readonly id = SURFACE_REGISTRY.excel.run.profile.id;
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
    private readonly internet: InternetCapability,
    private readonly threadSources: ThreadSourcesCapability,
    private readonly knowledgeBases: KnowledgeBasesCapability,
    private readonly recordings: RecordingsCapability,
    private readonly oparl: OparlCapability,
    private readonly notificationContext: NotificationContextCapability,
    private readonly releaseNoteContext: ReleaseNoteContextCapability,
    private readonly workspaceInstructions: WorkspaceInstructionsCapability,
    private readonly mcp: McpCapability,
  ) {}

  get capabilities(): readonly RunCapability[] {
    return SURFACE_REGISTRY.excel.run.capabilities.map((name) => this[name]);
  }
}
