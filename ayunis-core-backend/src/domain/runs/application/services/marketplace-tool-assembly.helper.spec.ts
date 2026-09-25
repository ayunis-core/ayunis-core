import type { ConfigService } from '@nestjs/config';
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

  function configWith(marketplaceEnabled: boolean | undefined): ConfigService {
    return {
      get: jest
        .fn()
        .mockImplementation((key: string) =>
          key === 'marketplace.enabled' ? marketplaceEnabled : undefined,
        ),
    } as unknown as ConfigService;
  }

  beforeEach(() => {
    assembleTool.execute.mockClear();
  });

  it('assembles search and install when the marketplace and skills are enabled', async () => {
    const tools = await assembleMarketplaceTools(
      configWith(true),
      assembleTool,
      true,
    );

    expect(tools.map((tool) => tool.type)).toEqual([
      ToolType.MARKETPLACE_SEARCH,
      ToolType.INSTALL_MARKETPLACE_SKILL,
    ]);
  });

  it('assembles only search when the skills feature is disabled', async () => {
    const tools = await assembleMarketplaceTools(
      configWith(true),
      assembleTool,
      false,
    );

    expect(tools.map((tool) => tool.type)).toEqual([
      ToolType.MARKETPLACE_SEARCH,
    ]);
  });

  it('assembles nothing when the marketplace is disabled', async () => {
    const tools = await assembleMarketplaceTools(
      configWith(false),
      assembleTool,
      true,
    );

    expect(tools).toEqual([]);
    expect(assembleTool.execute).not.toHaveBeenCalled();
  });

  it('treats a missing marketplace config as disabled', async () => {
    const tools = await assembleMarketplaceTools(
      configWith(undefined),
      assembleTool,
      true,
    );

    expect(tools).toEqual([]);
  });
});
