import type { SkillEntry } from 'src/common/util/skill-slug';
import { SystemPromptBuilderService } from './system-prompt-builder.service';
import { FileSource } from 'src/domain/sources/domain/sources/text-source.entity';
import { CSVDataSource } from 'src/domain/sources/domain/sources/data-source.entity';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import { SourceCreator } from 'src/domain/sources/domain/source-creator.enum';
import { FileType, TextType } from 'src/domain/sources/domain/source-type.enum';
import type { Source } from 'src/domain/sources/domain/source.entity';
import { randomUUID } from 'crypto';

describe('SystemPromptBuilderService', () => {
  let service: SystemPromptBuilderService;

  beforeEach(() => {
    service = new SystemPromptBuilderService();
  });

  describe('anonymization section', () => {
    it('includes the anonymized_data section when isAnonymous is true', () => {
      const prompt = service.build({
        tools: [],
        currentTime: new Date(),
        isAnonymous: true,
      });

      expect(prompt).toContain('<anonymized_data>');
      expect(prompt).toContain('{{pii:CATEGORY_NUMBER}}');
      expect(prompt).toContain('copy its placeholder verbatim');
    });

    it('omits the anonymized_data section when isAnonymous is false or unset', () => {
      const withFalse = service.build({
        tools: [],
        currentTime: new Date(),
        isAnonymous: false,
      });
      const withUnset = service.build({
        tools: [],
        currentTime: new Date(),
      });

      expect(withFalse).not.toContain('<anonymized_data>');
      expect(withUnset).not.toContain('<anonymized_data>');
    });
  });

  describe('knowledge boundaries section', () => {
    it('instructs the model to verify time-sensitive facts against external sources', () => {
      const result = service.build({
        tools: [],
        currentTime: new Date('2026-01-15T10:00:00Z'),
      });

      expect(result).toContain('<knowledge_boundaries>');
      expect(result).toContain('time-sensitive facts');
      expect(result).toContain('web search');
    });
  });

  describe('skills section', () => {
    it('should include available_skills section when active skills are provided', () => {
      const skills: SkillEntry[] = [
        {
          slug: 'user__german-administrative-law',
          description: 'Knowledge about German administrative law procedures',
        },
        {
          slug: 'system__data-analysis',
          description: 'Analyze datasets and produce statistical summaries',
        },
      ];

      const result = service.build({
        tools: [],
        currentTime: new Date('2026-01-15T10:00:00Z'),
        skills,
      });

      expect(result).toContain('<available_skills>');
      expect(result).toContain('</available_skills>');
      expect(result).toContain('<skill>');
      expect(result).toContain('<name>user__german-administrative-law</name>');
      expect(result).toContain(
        '<description>Knowledge about German administrative law procedures</description>',
      );
      expect(result).toContain('<name>system__data-analysis</name>');
      expect(result).toContain(
        '<description>Analyze datasets and produce statistical summaries</description>',
      );
    });

    it('should not include available_skills section when no skills are provided', () => {
      const result = service.build({
        tools: [],
        currentTime: new Date('2026-01-15T10:00:00Z'),
      });

      expect(result).not.toContain('<available_skills>');
    });

    it('should not include available_skills section when skills array is empty', () => {
      const result = service.build({
        tools: [],
        currentTime: new Date('2026-01-15T10:00:00Z'),
        skills: [],
      });

      expect(result).not.toContain('<available_skills>');
    });

    it('should escape XML characters in skill descriptions', () => {
      const skills: SkillEntry[] = [
        {
          slug: 'user__qa-helper',
          description: 'Handles <special> "quoted" queries & more',
        },
      ];

      const result = service.build({
        tools: [],
        currentTime: new Date('2026-01-15T10:00:00Z'),
        skills,
      });

      expect(result).toContain('<name>user__qa-helper</name>');
      expect(result).toContain(
        '<description>Handles &lt;special&gt; &quot;quoted&quot; queries &amp; more</description>',
      );
    });
  });

  describe('user instructions section', () => {
    it('should include user_instructions section when userSystemPrompt is provided', () => {
      const result = service.build({
        tools: [],
        currentTime: new Date('2026-01-15T10:00:00Z'),
        userSystemPrompt:
          'Always respond in bullet points. I work in the finance department.',
      });

      expect(result).toContain('<user_instructions>');
      expect(result).toContain(
        'Always respond in bullet points. I work in the finance department.',
      );
      expect(result).toContain('</user_instructions>');
    });

    it('should not include user_instructions section when userSystemPrompt is undefined', () => {
      const result = service.build({
        tools: [],
        currentTime: new Date('2026-01-15T10:00:00Z'),
      });

      expect(result).not.toContain('<user_instructions>');
    });

    it('should not include user_instructions section when userSystemPrompt is empty', () => {
      const result = service.build({
        tools: [],
        currentTime: new Date('2026-01-15T10:00:00Z'),
        userSystemPrompt: '',
      });

      expect(result).not.toContain('<user_instructions>');
    });

    it('should place user_instructions before the closing ready message', () => {
      const result = service.build({
        tools: [],
        currentTime: new Date('2026-01-15T10:00:00Z'),
        userSystemPrompt: 'My custom instructions',
      });

      const userPos = result.indexOf('<user_instructions>');
      const readyPos = result.indexOf('You are now ready to assist the user.');
      expect(userPos).toBeGreaterThan(-1);
      expect(readyPos).toBeGreaterThan(userPos);
    });
  });

  describe('organization instructions section', () => {
    it('should include organization_instructions section when orgSystemPrompt is provided', () => {
      const result = service.build({
        tools: [],
        currentTime: new Date('2026-01-15T10:00:00Z'),
        orgSystemPrompt:
          'All responses must comply with municipal communication guidelines.',
      });

      expect(result).toContain('<organization_instructions>');
      expect(result).toContain(
        'All responses must comply with municipal communication guidelines.',
      );
      expect(result).toContain('</organization_instructions>');
    });

    it('should not include organization_instructions section when orgSystemPrompt is undefined', () => {
      const result = service.build({
        tools: [],
        currentTime: new Date('2026-01-15T10:00:00Z'),
      });

      expect(result).not.toContain('<organization_instructions>');
    });

    it('should not include organization_instructions section when orgSystemPrompt is empty', () => {
      const result = service.build({
        tools: [],
        currentTime: new Date('2026-01-15T10:00:00Z'),
        orgSystemPrompt: '',
      });

      expect(result).not.toContain('<organization_instructions>');
    });

    it('should place organization_instructions before user_instructions when both are present', () => {
      const result = service.build({
        tools: [],
        currentTime: new Date('2026-01-15T10:00:00Z'),
        orgSystemPrompt: 'Org-wide instructions',
        userSystemPrompt: 'My custom instructions',
      });

      const orgPos = result.indexOf('<organization_instructions>');
      const userPos = result.indexOf('<user_instructions>');
      expect(orgPos).toBeGreaterThan(-1);
      expect(userPos).toBeGreaterThan(orgPos);
    });

    it('should place organization_instructions before the closing ready message', () => {
      const result = service.build({
        tools: [],
        currentTime: new Date('2026-01-15T10:00:00Z'),
        orgSystemPrompt: 'Org-wide instructions',
      });

      const orgPos = result.indexOf('<organization_instructions>');
      const readyPos = result.indexOf('You are now ready to assist the user.');
      expect(orgPos).toBeGreaterThan(-1);
      expect(readyPos).toBeGreaterThan(orgPos);
    });
  });

  describe('files section with source status', () => {
    function createFileSource(
      overrides: Partial<{
        name: string;
        status: SourceStatus;
        processingError: string | null;
        createdBy: SourceCreator;
      }> = {},
    ): Source {
      return new FileSource({
        id: randomUUID(),
        fileType: FileType.PDF,
        name: overrides.name ?? 'test.pdf',
        type: TextType.FILE,
        status: overrides.status ?? SourceStatus.READY,
        processingError: overrides.processingError ?? null,
        createdBy: overrides.createdBy ?? SourceCreator.USER,
      });
    }

    it('should show processing sources in pending_files section, not in available_files', () => {
      const processingSource = createFileSource({
        name: 'uploading.pdf',
        status: SourceStatus.PROCESSING,
      });

      const result = service.build({
        tools: [],
        currentTime: new Date('2026-01-15T10:00:00Z'),
        sources: [processingSource],
      });

      expect(result).toContain('<pending_files>');
      expect(result).toContain('name="uploading.pdf"');
      expect(result).toContain('status="processing"');
      expect(result).not.toContain('<available_files>');
    });

    it('should show failed sources in failed_files section with error message', () => {
      const failedSource = createFileSource({
        name: 'broken.pdf',
        status: SourceStatus.FAILED,
        processingError: 'Extraction timed out',
      });

      const result = service.build({
        tools: [],
        currentTime: new Date('2026-01-15T10:00:00Z'),
        sources: [failedSource],
      });

      expect(result).toContain('<failed_files>');
      expect(result).toContain('name="broken.pdf"');
      expect(result).toContain('error="Extraction timed out"');
      expect(result).not.toContain('<available_files>');
      expect(result).not.toContain('<pending_files>');
    });

    it('should show ready sources in available_files section (regression)', () => {
      const readySource = createFileSource({
        name: 'ready.pdf',
        status: SourceStatus.READY,
      });

      const result = service.build({
        tools: [],
        currentTime: new Date('2026-01-15T10:00:00Z'),
        sources: [readySource],
      });

      expect(result).toContain('<available_files>');
      expect(result).toContain('name="ready.pdf"');
      expect(result).not.toContain('<pending_files>');
      expect(result).not.toContain('<failed_files>');
    });

    it('should render all three sections for mixed ready + processing + failed sources', () => {
      const readySource = createFileSource({
        name: 'done.pdf',
        status: SourceStatus.READY,
      });
      const processingSource = createFileSource({
        name: 'loading.pdf',
        status: SourceStatus.PROCESSING,
      });
      const failedSource = createFileSource({
        name: 'error.pdf',
        status: SourceStatus.FAILED,
        processingError: 'Parse error',
      });

      const result = service.build({
        tools: [],
        currentTime: new Date('2026-01-15T10:00:00Z'),
        sources: [readySource, processingSource, failedSource],
      });

      expect(result).toContain('<available_files>');
      expect(result).toContain('name="done.pdf"');
      expect(result).toContain('<pending_files>');
      expect(result).toContain('name="loading.pdf"');
      expect(result).toContain('<failed_files>');
      expect(result).toContain('name="error.pdf"');
      expect(result).toContain('error="Parse error"');
    });

    it('should produce no file sections when sources array is empty (regression)', () => {
      const result = service.build({
        tools: [],
        currentTime: new Date('2026-01-15T10:00:00Z'),
        sources: [],
      });

      expect(result).not.toContain('<available_files>');
      expect(result).not.toContain('<pending_files>');
      expect(result).not.toContain('<failed_files>');
    });

    it('should list DataSources in available_data_sources, not available_files', () => {
      const csvSource = new CSVDataSource({
        id: randomUUID(),
        name: 'sales-data.csv',
        data: { headers: ['month', 'revenue'], rows: [['Jan', '1000']] },
        status: SourceStatus.READY,
        createdBy: SourceCreator.USER,
      });

      const result = service.build({
        tools: [],
        currentTime: new Date('2026-01-15T10:00:00Z'),
        sources: [csvSource],
      });

      expect(result).not.toContain('<available_files>');
      expect(result).toContain('<available_data_sources>');
      expect(result).toContain('name="sales-data.csv"');
      expect(result).toContain('code_execution');
    });

    it('should separate TextSources into available_files and DataSources into available_data_sources', () => {
      const textSource = createFileSource({
        name: 'report.pdf',
        status: SourceStatus.READY,
      });
      const csvSource = new CSVDataSource({
        id: randomUUID(),
        name: 'data.csv',
        data: { headers: ['a'], rows: [['1']] },
        status: SourceStatus.READY,
        createdBy: SourceCreator.USER,
      });

      const result = service.build({
        tools: [],
        currentTime: new Date('2026-01-15T10:00:00Z'),
        sources: [textSource, csvSource],
      });

      expect(result).toContain('<available_files>');
      expect(result).toContain('name="report.pdf"');
      expect(result).toContain('<available_data_sources>');
      expect(result).toContain('name="data.csv"');
    });

    it('should escape XML-special characters in source names and errors', () => {
      const failedSource = createFileSource({
        name: 'file<with>&"quotes\'.pdf',
        status: SourceStatus.FAILED,
        processingError: 'Error: <tag> & "stuff"',
      });

      const result = service.build({
        tools: [],
        currentTime: new Date('2026-01-15T10:00:00Z'),
        sources: [failedSource],
      });

      expect(result).toContain(
        'name="file&lt;with&gt;&amp;&quot;quotes&apos;.pdf"',
      );
      expect(result).toContain(
        'error="Error: &lt;tag&gt; &amp; &quot;stuff&quot;"',
      );
    });
  });
});
