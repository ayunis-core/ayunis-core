import { CreateFileTool } from 'src/domain/tools/domain/tools/create-file-tool.entity';
import { ActivateSkillTool } from 'src/domain/tools/domain/tools/activate-skill-tool.entity';
import type { Tool } from 'src/domain/tools/domain/tool.entity';
import type { McpToolAllowance } from 'src/domain/mcp/domain/mcp-tool-allowance.entity';
import { McpIntegrationTool } from 'src/domain/tools/domain/tools/mcp-integration-tool.entity';
import { BarChartTool } from 'src/domain/tools/domain/tools/bar-chart-tool.entity';
import { CreateCalendarEventTool } from 'src/domain/tools/domain/tools/create-calendar-event-tool.entity';
import { CreateDiagramTool } from 'src/domain/tools/domain/tools/create-diagram-tool.entity';
import { CreateDocumentTool } from 'src/domain/tools/domain/tools/create-document-tool.entity';
import { CreateRoutineTool } from 'src/domain/tools/domain/tools/create-routine-tool.entity';
import { CreateSkillTool } from 'src/domain/tools/domain/tools/create-skill-tool.entity';
import { CreateSpreadsheetTool } from 'src/domain/tools/domain/tools/create-spreadsheet-tool.entity';
import { EditDocumentTool } from 'src/domain/tools/domain/tools/edit-document-tool.entity';
import { EditRoutineTool } from 'src/domain/tools/domain/tools/edit-routine-tool.entity';
import { EditSkillTool } from 'src/domain/tools/domain/tools/edit-skill-tool.entity';
import { FinishRoutineTool } from 'src/domain/tools/domain/tools/finish-routine-tool.entity';
import { InstallMarketplaceSkillTool } from 'src/domain/tools/domain/tools/install-marketplace-skill-tool.entity';
import { LineChartTool } from 'src/domain/tools/domain/tools/line-chart-tool.entity';
import { MapTool } from 'src/domain/tools/domain/tools/map-tool.entity';
import { PieChartTool } from 'src/domain/tools/domain/tools/pie-chart-tool.entity';
import { SendEmailTool } from 'src/domain/tools/domain/tools/send-email-tool.entity';
import { UpdateDiagramTool } from 'src/domain/tools/domain/tools/update-diagram-tool.entity';
import { UpdateDocumentTool } from 'src/domain/tools/domain/tools/update-document-tool.entity';
import { UpdateSpreadsheetTool } from 'src/domain/tools/domain/tools/update-spreadsheet-tool.entity';
import { OutlookReadEmailTool } from 'src/domain/tools/domain/tools/outlook/outlook-read-email-tool.entity';
import { OutlookReadAttachmentTool } from 'src/domain/tools/domain/tools/outlook/outlook-read-attachment-tool.entity';
import { OutlookDraftEmailTool } from 'src/domain/tools/domain/tools/outlook/outlook-draft-email-tool.entity';
import { OutlookMoveEmailToComposerTool } from 'src/domain/tools/domain/tools/outlook/outlook-move-email-to-composer-tool.entity';
import { OutlookSaveEmailToDraftTool } from 'src/domain/tools/domain/tools/outlook/outlook-save-email-to-draft-tool.entity';

export function isAcknowledgementOnlyTool(tool: Tool): boolean {
  return (
    tool instanceof CreateFileTool ||
    tool instanceof BarChartTool ||
    tool instanceof LineChartTool ||
    tool instanceof MapTool ||
    tool instanceof PieChartTool
  );
}

const EXTERNALLY_HANDLED_TOOLS = [
  SendEmailTool,
  CreateCalendarEventTool,
  CreateSkillTool,
  EditSkillTool,
  InstallMarketplaceSkillTool,
  CreateRoutineTool,
  EditRoutineTool,
  FinishRoutineTool,
  OutlookReadEmailTool,
  OutlookReadAttachmentTool,
  OutlookDraftEmailTool,
  OutlookMoveEmailToComposerTool,
  OutlookSaveEmailToDraftTool,
];

export function isExternallyHandledTool(tool: Tool): boolean {
  return EXTERNALLY_HANDLED_TOOLS.some((type) => tool instanceof type);
}

/**
 * Externally handled tools whose result the model needs: the run still ends
 * on the call, but no placeholder result is stored, so the call stays open
 * on the thread until the client posts its result and the run resumes.
 */
export function isAwaitingClientResultTool(tool: Tool): boolean {
  return (
    tool instanceof OutlookReadEmailTool ||
    tool instanceof OutlookReadAttachmentTool
  );
}

/**
 * A valid call of a tool awaiting a client result settles with the runtime's
 * placeholder, which is not its result: when the run ends on that tool phase,
 * the placeholder is neither stored nor streamed. When the loop goes on
 * because a sibling call was invalid, the model has seen the placeholder, so
 * it is stored like any other result.
 */
export function awaitsClientResult(
  result: { toolName: string; isError?: boolean },
  endsRun: boolean,
  awaitingClientResultToolNames: ReadonlySet<string>,
): boolean {
  return (
    endsRun &&
    !result.isError &&
    awaitingClientResultToolNames.has(result.toolName)
  );
}

export function isHybridArtifactTool(tool: Tool): boolean {
  return (
    tool instanceof CreateDocumentTool ||
    tool instanceof UpdateDocumentTool ||
    tool instanceof EditDocumentTool ||
    tool instanceof CreateDiagramTool ||
    tool instanceof UpdateDiagramTool ||
    tool instanceof CreateSpreadsheetTool ||
    tool instanceof UpdateSpreadsheetTool
  );
}

/**
 * Tools whose side effects sibling calls in the same turn may observe or race
 * with: skill activation changes the thread's sources and integrations, and
 * artifact updates rewrite an existing artifact's latest version.
 */
export function requiresExclusiveExecution(tool: Tool): boolean {
  return (
    tool instanceof ActivateSkillTool ||
    tool instanceof UpdateDocumentTool ||
    tool instanceof EditDocumentTool ||
    tool instanceof UpdateDiagramTool ||
    tool instanceof UpdateSpreadsheetTool
  );
}

/**
 * Calls to an MCP tool wait for the user's confirmation unless the user always
 * allowed that tool of that integration. Tool annotations such as
 * `readOnlyHint` are ignored: servers report them unverified.
 */
export function requiresApproval(
  tool: Tool,
  allowances: readonly McpToolAllowance[],
): boolean {
  return (
    tool instanceof McpIntegrationTool &&
    !allowances.some(
      (allowance) =>
        allowance.integrationId === tool.integrationId &&
        allowance.toolName === tool.originalName,
    )
  );
}
