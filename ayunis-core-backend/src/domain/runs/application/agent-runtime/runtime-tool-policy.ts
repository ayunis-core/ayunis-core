import { CreateFileTool } from 'src/domain/tools/domain/tools/create-file-tool.entity';
import { ActivateSkillTool } from 'src/domain/tools/domain/tools/activate-skill-tool.entity';
import type { Tool } from 'src/domain/tools/domain/tool.entity';
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

export function isAcknowledgementOnlyTool(tool: Tool): boolean {
  return (
    tool instanceof CreateFileTool ||
    tool instanceof BarChartTool ||
    tool instanceof LineChartTool ||
    tool instanceof MapTool ||
    tool instanceof PieChartTool
  );
}

export function isExternallyHandledTool(tool: Tool): boolean {
  return (
    tool instanceof SendEmailTool ||
    tool instanceof CreateCalendarEventTool ||
    tool instanceof CreateSkillTool ||
    tool instanceof EditSkillTool ||
    tool instanceof InstallMarketplaceSkillTool ||
    tool instanceof CreateRoutineTool ||
    tool instanceof EditRoutineTool ||
    tool instanceof FinishRoutineTool
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
