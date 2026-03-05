import { ActivateSkillTool } from './activate-skill-tool.entity';

describe('ActivateSkillTool', () => {
  describe('resolveOriginalName', () => {
    it('should return the original name for a known slug', () => {
      const slugToName = new Map([
        ['system__data-privacy', 'Data Privacy'],
        ['user__budget-analysis', 'Budget Analysis'],
      ]);
      const tool = new ActivateSkillTool(slugToName);

      expect(tool.resolveOriginalName('system__data-privacy')).toBe(
        'Data Privacy',
      );
    });

    it('should return undefined for an unknown slug', () => {
      const slugToName = new Map([['system__data-privacy', 'Data Privacy']]);
      const tool = new ActivateSkillTool(slugToName);

      expect(
        tool.resolveOriginalName('system__nonexistent-skill'),
      ).toBeUndefined();
    });
  });

  describe('buildParameters', () => {
    it('should describe the parameter as a slug identifier', () => {
      const tool = new ActivateSkillTool(new Map());
      const params = tool.parameters as Record<string, unknown>;
      const properties = params.properties as Record<
        string,
        Record<string, unknown>
      >;

      expect(properties.skill_slug.description).toContain('slug');
    });
  });
});
