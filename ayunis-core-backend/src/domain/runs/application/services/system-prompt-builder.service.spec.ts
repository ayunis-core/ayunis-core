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

    it('should place user_instructions after agent_instructions', () => {
      const agent = {
        instructions: 'Agent-level instructions here',
      } as any;

      const result = service.build({
        agent,
        tools: [],
        currentTime: new Date('2026-01-15T10:00:00Z'),
        userSystemPrompt: 'User-level preferences here',
      });

      const agentPos = result.indexOf('<agent_instructions>');
      const userPos = result.indexOf('<user_instructions>');
      expect(agentPos).toBeGreaterThan(-1);
      expect(userPos).toBeGreaterThan(-1);
      expect(userPos).toBeGreaterThan(agentPos);
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

  describe('skills section (continued)', () => {
    it('should escape XML characters in skill names and descriptions', () => {
      const skills: Skill[] = [
        new Skill({
          id: randomUUID(),
          name: 'QA Helper',
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

      expect(result).toContain('<name>QA Helper</name>');
      expect(result).toContain(
        '<description>Handles &lt;special&gt; &quot;quoted&quot; queries &amp; more</description>',
      );
    });
  });
});
