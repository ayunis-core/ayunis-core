import type { AssembleToolUseCase } from 'src/domain/tools/application/use-cases/assemble-tool/assemble-tool.use-case';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import { assembleMarketplaceTools } from './marketplace-tool-assembly.helper';

describe(assembleMarketplaceTools.name, () => {
  const assembleTool = {
    execute: jest
      .fn()
      .mockImplementation((command: { type: ToolType }) =>
        Promise.resolve({ type: command.type, name: command.type }),
      ),
  } as unknown as jest.Mocked<AssembleToolUseCase>;

  beforeEach(() => {
    assembleTool.execute.mockClear();
  });

  it('assembles search and install when a marketplace is configured', async () => {
    const tools = await assembleMarketplaceTools({
      marketplaceEnabled: true,
      assembleToolsUseCase: assembleTool,
    });

    expect(tools.map((tool) => tool.type)).toEqual([
      ToolType.MARKETPLACE_SEARCH,
      ToolType.INSTALL_MARKETPLACE_SKILL,
    ]);
  });

  it('assembles nothing when the marketplace is disabled', async () => {
    const tools = await assembleMarketplaceTools({
      marketplaceEnabled: false,
      assembleToolsUseCase: assembleTool,
    });

    expect(tools).toEqual([]);
    expect(assembleTool.execute).not.toHaveBeenCalled();
  });
});
