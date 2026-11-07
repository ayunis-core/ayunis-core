import { Injectable } from '@nestjs/common';
import { SourceCreator } from 'src/domain/sources/domain/source-creator.enum';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import type { Source } from 'src/domain/sources/domain/source.entity';
import {
  CSVDataSource,
  DataSource,
} from 'src/domain/sources/domain/sources/data-source.entity';
import {
  FileSource,
  TextSource,
  UrlSource,
} from 'src/domain/sources/domain/sources/text-source.entity';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import { AssembleToolUseCase } from 'src/domain/tools/application/use-cases/assemble-tool/assemble-tool.use-case';
import { assembleTools } from 'src/domain/runs/application/run-capabilities/assemble-tools.helper';
import type { Tool } from 'src/domain/tools/domain/tool.entity';
import { escapeXml } from 'src/domain/runs/application/services/xml-escape';
import type { RunCapabilityContext } from 'src/domain/runs/application/run-capabilities/run-capability-context';
import {
  PromptSlot,
  type CapabilityContribution,
  type RunCapability,
} from 'src/domain/runs/application/run-capabilities/run-capability';

/**
 * Thread-attached files: the source query tools for text sources and the
 * prompt listing of every attached source by status. Data sources are listed
 * for `code_execution` (see `CodeExecutionCapability`).
 */
@Injectable()
export class ThreadSourcesCapability implements RunCapability {
  constructor(private readonly assembleToolUseCase: AssembleToolUseCase) {}

  async contribute(
    context: RunCapabilityContext,
  ): Promise<CapabilityContribution> {
    const filesSection = buildFilesSection(context.threadSources);
    return {
      tools: context.model.canUseTools
        ? await this.assembleSourceTools(context.threadSources)
        : [],
      sections: filesSection
        ? [{ slot: PromptSlot.RESOURCES, content: filesSection }]
        : [],
    };
  }

  private async assembleSourceTools(
    sources: readonly Source[],
  ): Promise<Tool[]> {
    const textSources = sources.filter(
      (source): source is TextSource => source instanceof TextSource,
    );
    if (textSources.length === 0) return [];
    return assembleTools(
      this.assembleToolUseCase,
      [ToolType.SOURCE_QUERY, ToolType.SOURCE_GET_TEXT],
      textSources,
    );
  }
}

function buildFilesSection(sources: readonly Source[]): string {
  // Only TextSources are searchable via source_query — DataSources are
  // handled by the code_execution tool and listed separately.
  const readyTextSources = sources.filter(
    (s) => s.status === SourceStatus.READY && s instanceof TextSource,
  );
  const readyDataSources = sources.filter(
    (s) => s.status === SourceStatus.READY && s instanceof DataSource,
  );
  const processingSources = sources.filter(
    (s) => s.status === SourceStatus.PROCESSING,
  );
  const failedSources = sources.filter((s) => s.status === SourceStatus.FAILED);

  const sections: string[] = [];
  if (readyTextSources.length > 0) {
    sections.push(buildAvailableFilesSection(readyTextSources));
  }
  if (readyDataSources.length > 0) {
    sections.push(buildDataSourcesSection(readyDataSources));
  }
  if (processingSources.length > 0) {
    sections.push(buildPendingFilesSection(processingSources));
  }
  if (failedSources.length > 0) {
    sections.push(buildFailedFilesSection(failedSources));
  }
  return sections.join('\n\n');
}

function formatFile(source: Source): string {
  return `<file id="${source.id}" name="${escapeXml(source.name)}" type="${getFileTypeLabel(source)}" />`;
}

function buildAvailableFilesSection(sources: Source[]): string {
  const userFiles = sources.filter((s) => s.createdBy === SourceCreator.USER);
  const systemFiles = sources.filter(
    (s) => s.createdBy === SourceCreator.SYSTEM,
  );
  const aiFiles = sources.filter((s) => s.createdBy === SourceCreator.LLM);

  let section = `<available_files>
The following files are available for you to search using the source_query tool.
Search all relevant files with all phrasings in a single source_query call by passing several sourceIds and queries.
`;

  if (userFiles.length > 0) {
    section += `
<user_uploaded_files>
${userFiles.map(formatFile).join('\n')}
</user_uploaded_files>
`;
  }

  if (aiFiles.length > 0) {
    section += `
<ai_generated_files>
${aiFiles.map(formatFile).join('\n')}
</ai_generated_files>
`;
  }

  if (systemFiles.length > 0) {
    section += `
<system_files note="not visible to user">
${systemFiles.map(formatFile).join('\n')}
</system_files>
`;
  }

  section += `
</available_files>`;

  return section;
}

function buildDataSourcesSection(sources: Source[]): string {
  return `<available_data_sources>
The following data sources are available for analysis using the code_execution tool.
These are structured data files (e.g., CSV) and cannot be searched with source_query.

${sources.map(formatFile).join('\n')}
</available_data_sources>`;
}

function buildPendingFilesSection(sources: Source[]): string {
  const files = sources
    .map(
      (s) =>
        `<file id="${s.id}" name="${escapeXml(s.name)}" status="processing" />`,
    )
    .join('\n');

  return `<pending_files>
The following files are currently being processed and are NOT yet available for search.
If the user asks about these files, let them know the upload is still processing.
${files}
</pending_files>`;
}

function buildFailedFilesSection(sources: Source[]): string {
  const files = sources
    .map(
      (s) =>
        `<file id="${s.id}" name="${escapeXml(s.name)}" error="${escapeXml(s.processingError ?? 'Unknown error')}" />`,
    )
    .join('\n');

  return `<failed_files>
The following file uploads failed. Let the user know if they ask about them.
${files}
</failed_files>`;
}

function getFileTypeLabel(source: Source): string {
  if (source instanceof FileSource) {
    return source.fileType.toUpperCase();
  }
  if (source instanceof UrlSource) {
    return 'Web URL';
  }
  if (source instanceof CSVDataSource) {
    return 'CSV';
  }
  if (source instanceof TextSource) {
    return 'Text';
  }
  if (source instanceof DataSource) {
    return 'Data';
  }
  return 'Unknown';
}
