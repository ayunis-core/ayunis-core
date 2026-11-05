import type { Source } from 'src/domain/sources/domain/source.entity';
import { SourceCreator } from 'src/domain/sources/domain/source-creator.enum';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import {
  TextSource,
  FileSource,
  UrlSource,
} from 'src/domain/sources/domain/sources/text-source.entity';
import {
  DataSource,
  CSVDataSource,
} from 'src/domain/sources/domain/sources/data-source.entity';

import { escapeXml } from './xml-escape';

export function buildFilesSection(sources: Source[]): string {
  if (sources.length === 0) {
    return '';
  }

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

function buildAvailableFilesSection(sources: Source[]): string {
  const userFiles = sources.filter((s) => s.createdBy === SourceCreator.USER);
  const systemFiles = sources.filter(
    (s) => s.createdBy === SourceCreator.SYSTEM,
  );
  const aiFiles = sources.filter((s) => s.createdBy === SourceCreator.LLM);

  const formatFile = (source: Source): string => {
    const type = getFileTypeLabel(source);
    return `<file id="${source.id}" name="${escapeXml(source.name)}" type="${type}" />`;
  };

  let section = `<available_files>
The following files are available for you to search using the source_query tool.
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
  const formatFile = (source: Source): string => {
    const type = getFileTypeLabel(source);
    return `<file id="${source.id}" name="${escapeXml(source.name)}" type="${type}" />`;
  };

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
