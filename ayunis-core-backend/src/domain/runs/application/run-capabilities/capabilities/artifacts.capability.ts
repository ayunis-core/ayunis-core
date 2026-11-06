import { Injectable } from '@nestjs/common';
import { ArtifactToolAssemblerService } from 'src/domain/runs/application/services/artifact-tool-assembler.service';
import type { RunCapabilityContext } from 'src/domain/runs/application/run-capabilities/run-capability-context';
import {
  PromptSlot,
  type CapabilityContribution,
  type RunCapability,
} from 'src/domain/runs/application/run-capabilities/run-capability';

const DOCUMENT_USAGE = `<document_usage>
**Default to inline responses.** Respond directly in the chat for questions, explanations, summaries, brainstorming, code snippets, and general conversation — even if the response is long or uses formatting.

Only use create_document when the user explicitly asks for a prose document (Word/PDF) they intend to edit, export, or download — for example: "Write me a letter", "Create a report I can export as PDF", "Draft a formal document". Keywords like "document", "letter", "report", "draft", "Schreiben", "Dokument", "Brief", or "Vorlage" are strong signals.

If in doubt, respond inline. The user can always ask you to turn a response into a document.
</document_usage>`;

const DIAGRAM_USAGE = `<diagram_usage>
Use create_diagram when the user asks for a visual — a flowchart, sequence diagram, entity-relationship diagram, class diagram, state diagram, or similar. The content must be valid mermaid source (e.g. starting with "flowchart TD", "sequenceDiagram", "erDiagram"). Do not wrap the source in code fences or markdown.

Prefer create_diagram over inline mermaid code blocks when the user explicitly asks for a diagram they want to view, iterate on, or export. For a quick sketch in the middle of a conversation, an inline mermaid code block is fine.
</diagram_usage>`;

const SPREADSHEET_USAGE = `<spreadsheet_usage>
Use create_spreadsheet when the user asks for tabular data they intend to edit, extend, or export to Excel/CSV — for example a budget, inventory list, schedule, or dataset. For a quick illustrative table inside an answer, prefer an inline markdown table; the user can always ask to turn it into a spreadsheet.

Provide typed values: numbers as JSON numbers (not strings) so exported cells are numeric, and null for empty cells. Updates via update_spreadsheet replace the entire spreadsheet — always pass the complete columns and rows. Take expected_version from the update_spreadsheet tool description, which lists every spreadsheet with its current version; the user may have edited the spreadsheet since your last tool call, so a version remembered from an earlier tool result can be stale. On a version conflict, follow the recovery guidance in the error message.

When the rows come from a CSV data source in this conversation — an uploaded file, or a CSV that code_execution wrote to /execution/output/ — pass its data_source_id instead of columns and rows. Every row is then copied server-side, so a long table is never truncated; do not refuse, sample, or shorten a table because of its size. To filter, group, sort, or add columns first, write the finished table with code_execution and import the data source it reports.

Use Excel formulas for totals and derived cells: a cell whose string value starts with "=" is a formula, e.g. "=SUM(B2:B10)" or "=B2*C2". Coordinates use A1 notation where the header row is row 1 and the first data row is row 2. Prefer formulas over pre-computed aggregates so results stay correct when the user edits the data.
</spreadsheet_usage>`;

@Injectable()
export class ArtifactsCapability implements RunCapability {
  constructor(
    private readonly artifactToolAssembler: ArtifactToolAssemblerService,
  ) {}

  // The usage guidance is contributed even when the model cannot use tools;
  // the chat prompt has always carried it.
  async contribute(
    context: RunCapabilityContext,
  ): Promise<CapabilityContribution> {
    const sections = [DOCUMENT_USAGE, DIAGRAM_USAGE, SPREADSHEET_USAGE].map(
      (content) => ({ slot: PromptSlot.TOOL_USAGE, content }),
    );
    if (!context.model.canUseTools) return { sections };
    const tools = await this.artifactToolAssembler.assembleArtifactTools(
      context.thread,
    );
    return { tools, sections };
  }
}
