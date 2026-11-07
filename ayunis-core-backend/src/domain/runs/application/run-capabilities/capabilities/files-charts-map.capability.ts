import { Injectable } from '@nestjs/common';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import { AssembleToolUseCase } from 'src/domain/tools/application/use-cases/assemble-tool/assemble-tool.use-case';
import { assembleTools } from 'src/domain/runs/application/run-capabilities/assemble-tools.helper';
import type { RunCapabilityContext } from 'src/domain/runs/application/run-capabilities/run-capability-context';
import {
  PromptSlot,
  type CapabilityContribution,
  type RunCapability,
} from 'src/domain/runs/application/run-capabilities/run-capability';

const DISPLAY_TOOL_TYPES = [
  ToolType.CREATE_FILE,
  ToolType.BAR_CHART,
  ToolType.LINE_CHART,
  ToolType.PIE_CHART,
  ToolType.MAP,
];

const FILE_USAGE = `<file_usage>
Use create_file for downloadable CSV, XML, JSON and plain-text (TXT) files, including requests such as "eine XML-Datei zum Download". Do not use create_document or markdown links for these files. Supply the complete content as a string, the format (csv, xml, json or txt), and a filename without extension. The file widget offers the download; you may continue your answer after creating it. For CSV reconciliation exports, include a header and the complete table in content. Include all individual rows, not only status counts or summaries. If you use code_execution to compute the result, print the complete CSV so you can pass it to create_file; internal processing paths are not download links. Use create_spreadsheet when the user wants an editable table or Excel export. Never claim a file was created without a successful tool call. Keep ordinary answers and code snippets inline unless the user requests a file.
</file_usage>`;

@Injectable()
export class FilesChartsMapCapability implements RunCapability {
  constructor(private readonly assembleToolUseCase: AssembleToolUseCase) {}

  // The usage guidance is contributed even when the model cannot use tools;
  // the chat prompt has always carried it.
  async contribute(
    context: RunCapabilityContext,
  ): Promise<CapabilityContribution> {
    const sections = [{ slot: PromptSlot.TOOL_USAGE, content: FILE_USAGE }];
    if (!context.model.canUseTools) return { sections };
    const tools = await assembleTools(
      this.assembleToolUseCase,
      DISPLAY_TOOL_TYPES,
    );
    return { tools, sections };
  }
}
