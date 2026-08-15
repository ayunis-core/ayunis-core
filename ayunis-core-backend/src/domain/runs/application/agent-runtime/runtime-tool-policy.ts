import type { Tool } from 'src/domain/tools/domain/tool.entity';
import { BarChartTool } from 'src/domain/tools/domain/tools/bar-chart-tool.entity';
import { CreateCalendarEventTool } from 'src/domain/tools/domain/tools/create-calendar-event-tool.entity';
import { CreateDiagramTool } from 'src/domain/tools/domain/tools/create-diagram-tool.entity';
import { CreateDocumentTool } from 'src/domain/tools/domain/tools/create-document-tool.entity';
import { CreateSkillTool } from 'src/domain/tools/domain/tools/create-skill-tool.entity';
import { CreateSpreadsheetTool } from 'src/domain/tools/domain/tools/create-spreadsheet-tool.entity';
import { EditDocumentTool } from 'src/domain/tools/domain/tools/edit-document-tool.entity';
import { EditSkillTool } from 'src/domain/tools/domain/tools/edit-skill-tool.entity';
import { LineChartTool } from 'src/domain/tools/domain/tools/line-chart-tool.entity';
import { PieChartTool } from 'src/domain/tools/domain/tools/pie-chart-tool.entity';
import { SendEmailTool } from 'src/domain/tools/domain/tools/send-email-tool.entity';
import { UpdateDiagramTool } from 'src/domain/tools/domain/tools/update-diagram-tool.entity';
import { UpdateDocumentTool } from 'src/domain/tools/domain/tools/update-document-tool.entity';
import { UpdateSpreadsheetTool } from 'src/domain/tools/domain/tools/update-spreadsheet-tool.entity';

export function isAcknowledgementOnlyTool(tool: Tool): boolean {
  return (
    tool instanceof BarChartTool ||
    tool instanceof LineChartTool ||
    tool instanceof PieChartTool
  );
}

export function isExternallyHandledTool(tool: Tool): boolean {
  return (
    tool instanceof SendEmailTool ||
    tool instanceof CreateCalendarEventTool ||
    tool instanceof CreateSkillTool ||
    tool instanceof EditSkillTool
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
