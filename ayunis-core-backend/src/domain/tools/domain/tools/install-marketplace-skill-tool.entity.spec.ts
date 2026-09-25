import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import { InstallMarketplaceSkillTool } from './install-marketplace-skill-tool.entity';

describe('InstallMarketplaceSkillTool', () => {
  const tool = new InstallMarketplaceSkillTool();

  it('is named after its tool type', () => {
    expect(tool.name).toBe(ToolType.INSTALL_MARKETPLACE_SKILL);
    expect(tool.type).toBe(ToolType.INSTALL_MARKETPLACE_SKILL);
  });

  it('requires the marketplace identifier and the skill name', () => {
    expect(
      tool.validateParams({
        identifier: 'finance-clerk',
        name: 'Finanzsachbearbeitung',
        reason: 'Fits budget work',
      }),
    ).toEqual({
      identifier: 'finance-clerk',
      name: 'Finanzsachbearbeitung',
      reason: 'Fits budget work',
    });
    expect(() => tool.validateParams({ name: 'No identifier' })).toThrow();
    expect(() => tool.validateParams({ identifier: '', name: 'x' })).toThrow();
  });

  it('rejects unknown properties', () => {
    expect(() =>
      tool.validateParams({ identifier: 'a', name: 'b', autoInstall: true }),
    ).toThrow();
  });

  it('tells the model the user confirms and integrations are excluded', () => {
    expect(tool.description).toContain('nothing is installed until they do');
    expect(tool.description).toContain('Never use it for integrations');
  });

  it('does not return personal data', () => {
    expect(tool.returnsPii).toBe(false);
  });
});
