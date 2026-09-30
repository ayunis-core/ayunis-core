import { Controller, Get, Put, Body } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiResponse, ApiBody } from '@nestjs/swagger';
import { Roles } from 'src/iam/authorization/application/decorators/roles.decorator';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { GetOrgChatSettingsUseCase } from 'src/domain/chat-settings/application/use-cases/get-org-chat-settings/get-org-chat-settings.use-case';
import { UpsertOrgChatSettingsUseCase } from 'src/domain/chat-settings/application/use-cases/upsert-org-chat-settings/upsert-org-chat-settings.use-case';
import { UpsertOrgChatSettingsCommand } from 'src/domain/chat-settings/application/use-cases/upsert-org-chat-settings/upsert-org-chat-settings.command';
import { UpsertOrgChatSettingsDto } from './dtos/upsert-org-chat-settings.dto';
import { ChatStartDefaultsResponseDto } from './dtos/chat-start-defaults-response.dto';
import { OrgChatSettingsResponseDto } from './dtos/org-chat-settings-response.dto';

@ApiTags('Chat Settings')
@Controller('chat-settings')
export class OrgChatSettingsController {
  constructor(
    private readonly getOrgChatSettingsUseCase: GetOrgChatSettingsUseCase,
    private readonly upsertOrgChatSettingsUseCase: UpsertOrgChatSettingsUseCase,
  ) {}

  @Get('chat-start-defaults')
  @ApiOperation({
    summary:
      'Get chat-start defaults for the authenticated organization member',
  })
  @ApiResponse({ status: 200, type: ChatStartDefaultsResponseDto })
  async getChatStartDefaults(): Promise<ChatStartDefaultsResponseDto> {
    const result = await this.getOrgChatSettingsUseCase.execute();
    return { anonymousModeByDefault: result.anonymousModeByDefault };
  }

  @Get('org-chat-settings')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get the organization-wide chat settings',
    description:
      "Returns the organization-wide chat settings for the admin's organization. Defaults to internet access enabled when not configured. Admin only.",
  })
  @ApiResponse({
    status: 200,
    description: 'The organization-wide chat settings',
    type: OrgChatSettingsResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'User is not an organization admin',
  })
  async getOrgChatSettings(): Promise<OrgChatSettingsResponseDto> {
    const result = await this.getOrgChatSettingsUseCase.execute();

    return {
      internetSearchEnabled: result.internetSearchEnabled,
      anonymousModeByDefault: result.anonymousModeByDefault,
    };
  }

  @Put('org-chat-settings')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Set or update the organization-wide chat settings',
    description:
      'Creates or partially updates the organization-wide chat settings. Omitted settings are preserved. When internet access is disabled, web search and website content tools are not offered to the AI assistant in any of the org users conversations. Admin only.',
  })
  @ApiBody({ type: UpsertOrgChatSettingsDto })
  @ApiResponse({
    status: 200,
    description:
      'Successfully set or updated the organization-wide chat settings',
    type: OrgChatSettingsResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request payload',
  })
  @ApiResponse({
    status: 403,
    description: 'User is not an organization admin',
  })
  async upsertOrgChatSettings(
    @Body() dto: UpsertOrgChatSettingsDto,
  ): Promise<OrgChatSettingsResponseDto> {
    const command = new UpsertOrgChatSettingsCommand(dto);
    const result = await this.upsertOrgChatSettingsUseCase.execute(command);

    return {
      internetSearchEnabled: result.internetSearchEnabled,
      anonymousModeByDefault: result.anonymousModeByDefault,
    };
  }
}
