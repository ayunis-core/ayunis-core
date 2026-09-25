import type { ConfigService } from '@nestjs/config';
import type { Tool } from 'src/domain/tools/domain/tool.entity';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import type { AssembleToolUseCase } from 'src/domain/tools/application/use-cases/assemble-tool/assemble-tool.use-case';
import { AssembleToolCommand } from 'src/domain/tools/application/use-cases/assemble-tool/assemble-tool.command';

// Self-hosted installations without a marketplace must never see the tools,
// so the assistant has nothing to mention. Installing needs the skills
// feature: the install card creates a personal skill.
export async function assembleMarketplaceTools(
  configService: ConfigService,
  assembleToolsUseCase: AssembleToolUseCase,
  skillsEnabled: boolean,
): Promise<Tool[]> {
  if (!configService.get<boolean>('marketplace.enabled')) {
    return [];
  }
  const types = skillsEnabled
    ? [ToolType.MARKETPLACE_SEARCH, ToolType.INSTALL_MARKETPLACE_SKILL]
    : [ToolType.MARKETPLACE_SEARCH];
  return Promise.all(
    types.map((type) =>
      assembleToolsUseCase.execute(new AssembleToolCommand({ type })),
    ),
  );
}
