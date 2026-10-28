import type { Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { GetOrgChatSettingsUseCase } from 'src/domain/chat-settings/application/use-cases/get-org-chat-settings/get-org-chat-settings.use-case';
import type { Tool } from 'src/domain/tools/domain/tool.entity';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import type { AssembleToolUseCase } from 'src/domain/tools/application/use-cases/assemble-tool/assemble-tool.use-case';
import { AssembleToolCommand } from 'src/domain/tools/application/use-cases/assemble-tool/assemble-tool.command';

export async function assembleInternetTools(args: {
  getOrgChatSettingsUseCase: GetOrgChatSettingsUseCase;
  configService: ConfigService;
  assembleToolsUseCase: AssembleToolUseCase;
  logger: Logger;
}): Promise<Tool[]> {
  const { getOrgChatSettingsUseCase, configService, assembleToolsUseCase } =
    args;
  const orgChatSettings = await getOrgChatSettingsUseCase.execute();
  if (!orgChatSettings.internetSearchEnabled) {
    args.logger.debug('Internet access disabled for org, skipping web tools');
    return [];
  }

  const tools: Tool[] = [
    await assembleToolsUseCase.execute(
      new AssembleToolCommand({ type: ToolType.WEBSITE_CONTENT }),
    ),
  ];

  if (configService.get<boolean>('internetSearch.isAvailable')) {
    tools.push(
      await assembleToolsUseCase.execute(
        new AssembleToolCommand({ type: ToolType.INTERNET_SEARCH }),
      ),
    );
  }
  return tools;
}
