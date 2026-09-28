import type { Tool } from 'src/domain/tools/domain/tool.entity';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import type { AssembleToolUseCase } from 'src/domain/tools/application/use-cases/assemble-tool/assemble-tool.use-case';
import { AssembleToolCommand } from 'src/domain/tools/application/use-cases/assemble-tool/assemble-tool.command';

// Self-hosted installations without a marketplace must never see the tools,
// so the assistant has nothing to mention.
export async function assembleMarketplaceTools(args: {
  marketplaceEnabled: boolean;
  assembleToolsUseCase: AssembleToolUseCase;
}): Promise<Tool[]> {
  const { marketplaceEnabled, assembleToolsUseCase } = args;
  if (!marketplaceEnabled) {
    return [];
  }
  const types = [
    ToolType.MARKETPLACE_SEARCH,
    ToolType.INSTALL_MARKETPLACE_SKILL,
  ];
  return Promise.all(
    types.map((type) =>
      assembleToolsUseCase.execute(new AssembleToolCommand({ type })),
    ),
  );
}
