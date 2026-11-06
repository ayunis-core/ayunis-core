import { randomUUID } from 'crypto';
import { SourceCreator } from 'src/domain/sources/domain/source-creator.enum';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import { FileType, TextType } from 'src/domain/sources/domain/source-type.enum';
import type { Source } from 'src/domain/sources/domain/source.entity';
import { CSVDataSource } from 'src/domain/sources/domain/sources/data-source.entity';
import { FileSource } from 'src/domain/sources/domain/sources/text-source.entity';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import { PromptSlot } from 'src/domain/runs/application/run-capabilities/run-capability';
import {
  aCapabilityContext,
  createAssembleToolUseCase,
  sectionsIn,
  toolNames,
} from 'src/domain/runs/testing/run-capability.fixture';
import { ThreadSourcesCapability } from './thread-sources.capability';

function aFileSource(
  overrides: Partial<{
    name: string;
    status: SourceStatus;
    processingError: string | null;
  }> = {},
): Source {
  return new FileSource({
    id: randomUUID(),
    fileType: FileType.PDF,
    name: overrides.name ?? 'Haushaltsplan.pdf',
    type: TextType.FILE,
    status: overrides.status ?? SourceStatus.READY,
    processingError: overrides.processingError ?? null,
    createdBy: SourceCreator.USER,
  });
}

function aCsvSource(name = 'sales-data.csv'): Source {
  return new CSVDataSource({
    id: randomUUID(),
    name,
    data: { headers: ['month', 'revenue'], rows: [['Jan', '1000']] },
    status: SourceStatus.READY,
    createdBy: SourceCreator.USER,
  });
}

describe('ThreadSourcesCapability', () => {
  const capability = new ThreadSourcesCapability(createAssembleToolUseCase());
  const filesPrompt = async (
    threadSources: Source[],
    canUseTools = true,
  ): Promise<string> =>
    sectionsIn(
      await capability.contribute(
        aCapabilityContext({ threadSources, canUseTools }),
      ),
      PromptSlot.RESOURCES,
    ).join('\n');

  it('offers the source query tools for attached text files', async () => {
    const contribution = await capability.contribute(
      aCapabilityContext({ threadSources: [aFileSource()] }),
    );

    expect(toolNames(contribution)).toEqual([
      ToolType.SOURCE_QUERY,
      ToolType.SOURCE_GET_TEXT,
    ]);
  });

  it('offers no source tools for data sources only', async () => {
    const contribution = await capability.contribute(
      aCapabilityContext({ threadSources: [aCsvSource()] }),
    );

    expect(contribution.tools).toEqual([]);
  });

  it('lists the thread files but offers no tools when the model cannot use tools', async () => {
    const contribution = await capability.contribute(
      aCapabilityContext({
        threadSources: [aFileSource()],
        canUseTools: false,
      }),
    );

    expect(contribution.tools).toEqual([]);
    expect(sectionsIn(contribution, PromptSlot.RESOURCES)[0]).toContain(
      '<available_files>',
    );
  });

  it('tells the model to search several files and phrasings in one source_query call', async () => {
    expect(await filesPrompt([aFileSource()])).toContain(
      'Search all relevant files with all phrasings in a single source_query call by passing several sourceIds and queries.',
    );
  });

  it('lists processing files as pending, not as available', async () => {
    const prompt = await filesPrompt([
      aFileSource({ name: 'uploading.pdf', status: SourceStatus.PROCESSING }),
    ]);

    expect(prompt).toContain('<pending_files>');
    expect(prompt).toContain('name="uploading.pdf"');
    expect(prompt).toContain('status="processing"');
    expect(prompt).not.toContain('<available_files>');
  });

  it('lists failed files with their error', async () => {
    const prompt = await filesPrompt([
      aFileSource({
        name: 'broken.pdf',
        status: SourceStatus.FAILED,
        processingError: 'Extraction timed out',
      }),
    ]);

    expect(prompt).toContain('<failed_files>');
    expect(prompt).toContain('error="Extraction timed out"');
    expect(prompt).not.toContain('<available_files>');
    expect(prompt).not.toContain('<pending_files>');
  });

  it('lists data sources for code execution, separate from searchable files', async () => {
    const prompt = await filesPrompt([
      aFileSource({ name: 'report.pdf' }),
      aCsvSource('data.csv'),
    ]);

    expect(prompt).toContain('<available_files>');
    expect(prompt).toContain('name="report.pdf"');
    expect(prompt).toContain('<available_data_sources>');
    expect(prompt).toContain('name="data.csv"');
  });

  it('escapes XML-special characters in source names and errors', async () => {
    const prompt = await filesPrompt([
      aFileSource({
        name: 'file<with>&"quotes\'.pdf',
        status: SourceStatus.FAILED,
        processingError: 'Error: <tag> & "stuff"',
      }),
    ]);

    expect(prompt).toContain(
      'name="file&lt;with&gt;&amp;&quot;quotes&apos;.pdf"',
    );
    expect(prompt).toContain(
      'error="Error: &lt;tag&gt; &amp; &quot;stuff&quot;"',
    );
  });

  it('contributes nothing for a thread without sources', async () => {
    expect(await capability.contribute(aCapabilityContext())).toEqual({
      tools: [],
      sections: [],
    });
  });
});
