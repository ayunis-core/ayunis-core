import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import { MarketplaceSearchTool } from './marketplace-search-tool.entity';

describe('MarketplaceSearchTool', () => {
  const tool = new MarketplaceSearchTool();

  it('is named after its tool type', () => {
    expect(tool.name).toBe(ToolType.MARKETPLACE_SEARCH);
    expect(tool.type).toBe(ToolType.MARKETPLACE_SEARCH);
  });

  it('accepts an empty input and each catalogue type', () => {
    expect(tool.validateParams({})).toEqual({});
    expect(tool.validateParams({ type: 'skill' })).toEqual({ type: 'skill' });
    expect(tool.validateParams({ type: 'integration' })).toEqual({
      type: 'integration',
    });
    expect(tool.validateParams({ type: 'all' })).toEqual({ type: 'all' });
  });

  it('rejects unknown types and unknown properties', () => {
    expect(() => tool.validateParams({ type: 'agent' })).toThrow();
    expect(() => tool.validateParams({ query: 'finance' })).toThrow();
  });

  it('tells the model that integrations are installed by an administrator', () => {
    expect(tool.descriptionLong).toContain('administrator');
    expect(tool.descriptionLong).toContain('Never invent entries');
  });

  it('tells the model to offer activation for skills the user already has', () => {
    expect(tool.descriptionLong).toContain('already installed');
    expect(tool.descriptionLong).toContain('offer to activate it');
  });

  it('does not return personal data', () => {
    expect(tool.returnsPii).toBe(false);
  });
});
