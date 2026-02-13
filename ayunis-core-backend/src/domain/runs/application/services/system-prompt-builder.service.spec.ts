import { SystemPromptBuilderService } from './system-prompt-builder.service';
import { Skill } from 'src/domain/skills/domain/skill.entity';
import { randomUUID } from 'crypto';

describe('SystemPromptBuilderService', () => {
  let service: SystemPromptBuilderService;

  beforeEach(() => {
    service = new SystemPromptBuilderService();
  });

  describe('skills section', () => {
    it('should include available_skills section when active skills are provided', () => {
      const skills: Skill[] = [
        new Skill({
          id: randomUUID(),
          name: 'German Administrative Law',
          shortDescription:
            'Knowledge about German administrative law procedures',
          instructions: 'Full instructions here...',
          isActive: true,
          userId: randomUUID(),
        }),
        new Skill({
          id: randomUUID(),
          name: 'Data Analysis',
          shortDescription:
            'Analyze datasets and produce statistical summaries',
          instructions: 'Full data analysis instructions...',
          isActive: true,
          userId: randomUUID(),
        }),
      ];

      const result = service.build({
        tools: [],
        currentTime: new Date('2026-01-15T10:00:00Z'),
        skills,
      });

      expect(result).toContain('<available_skills>');
      expect(result).toContain('</available_skills>');
      expect(result).toContain('<skill>');
      expect(result).toContain('<name>German Administrative Law</name>');
      expect(result).toContain(
        '<description>Knowledge about German administrative law procedures</description>',
      );
      expect(result).toContain('<name>Data Analysis</name>');
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

    it('should escape XML characters in skill names and descriptions', () => {
      const skills: Skill[] = [
        new Skill({
          id: randomUUID(),
          name: 'Q&A Helper',
          shortDescription: 'Handles <special> "quoted" queries & more',
          instructions: 'Instructions...',
          isActive: true,
          userId: randomUUID(),
        }),
      ];

      const result = service.build({
        tools: [],
        currentTime: new Date('2026-01-15T10:00:00Z'),
        skills,
      });

      expect(result).toContain('<name>Q&amp;A Helper</name>');
      expect(result).toContain(
        '<description>Handles &lt;special&gt; &quot;quoted&quot; queries &amp; more</description>',
      );
    });
  });
});
