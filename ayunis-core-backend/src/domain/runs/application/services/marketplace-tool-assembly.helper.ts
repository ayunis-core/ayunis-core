import type { ConfigService } from '@nestjs/config';
import type { Tool } from 'src/domain/tools/domain/tool.entity';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import type { AssembleToolUseCase } from 'src/domain/tools/application/use-cases/assemble-tool/assemble-tool.use-case';
import { AssembleToolCommand } from 'src/domain/tools/application/use-cases/assemble-tool/assemble-tool.command';

// Self-hosted installations without a marketplace must never see the tool,
// so the assistant has nothing to mention.
export async function assembleMarketplaceTools(
  configService: ConfigService,
  assembleToolsUseCase: AssembleToolUseCase,
): Promise<Tool[]> {
  if (!configService.get<boolean>('marketplace.enabled')) {
    return [];
  }
  return [
    await assembleToolsUseCase.execute(
      new AssembleToolCommand({ type: ToolType.MARKETPLACE_SEARCH }),
    ),
  ];
}
