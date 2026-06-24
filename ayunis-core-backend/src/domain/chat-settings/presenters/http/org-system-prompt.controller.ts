import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiOperation, ApiTags, ApiResponse, ApiBody } from '@nestjs/swagger';
import { Roles } from 'src/iam/authorization/application/decorators/roles.decorator';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { GetOrgSystemPromptUseCase } from '../../application/use-cases/get-org-system-prompt/get-org-system-prompt.use-case';
import { UpsertOrgSystemPromptUseCase } from '../../application/use-cases/upsert-org-system-prompt/upsert-org-system-prompt.use-case';
import { UpsertOrgSystemPromptCommand } from '../../application/use-cases/upsert-org-system-prompt/upsert-org-system-prompt.command';
import { DeleteOrgSystemPromptUseCase } from '../../application/use-cases/delete-org-system-prompt/delete-org-system-prompt.use-case';
import { UpsertOrgSystemPromptDto } from './dtos/upsert-org-system-prompt.dto';
import { OrgSystemPromptResponseDto } from './dtos/org-system-prompt-response.dto';

@ApiTags('Chat Settings')
@Controller('chat-settings')
export class OrgSystemPromptController {
  constructor(
    private readonly getOrgSystemPromptUseCase: GetOrgSystemPromptUseCase,
    private readonly upsertOrgSystemPromptUseCase: UpsertOrgSystemPromptUseCase,
    private readonly deleteOrgSystemPromptUseCase: DeleteOrgSystemPromptUseCase,
  ) {}

  @Get('org-system-prompt')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get the organization-wide system prompt',
    description:
      "Returns the organization-wide system prompt for the admin's organization, or null if not set. Admin only.",
  })
  @ApiResponse({
    status: 200,
    description: 'The organization-wide system prompt',
    type: OrgSystemPromptResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'User is not an organization admin',
  })
  async getOrgSystemPrompt(): Promise<OrgSystemPromptResponseDto> {
    const result = await this.getOrgSystemPromptUseCase.execute();

    return {
      systemPrompt: result?.systemPrompt ?? null,
    };
  }

  @Put('org-system-prompt')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Set or update the organization-wide system prompt',
    description:
      'Creates or replaces the organization-wide system prompt, which is injected into all conversations of users of the organization. Admin only.',
  })
  @ApiBody({ type: UpsertOrgSystemPromptDto })
  @ApiResponse({
    status: 200,
    description:
      'Successfully set or updated the organization-wide system prompt',
    type: OrgSystemPromptResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request payload',
  })
  @ApiResponse({
    status: 403,
    description: 'User is not an organization admin',
  })
  async upsertOrgSystemPrompt(
    @Body() dto: UpsertOrgSystemPromptDto,
  ): Promise<OrgSystemPromptResponseDto> {
    const command = new UpsertOrgSystemPromptCommand(dto.systemPrompt);
    const result = await this.upsertOrgSystemPromptUseCase.execute(command);

    return {
      systemPrompt: result.systemPrompt,
    };
  }

  @Delete('org-system-prompt')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete the organization-wide system prompt',
    description: 'Deletes the organization-wide system prompt. Admin only.',
  })
  @ApiResponse({
    status: 204,
    description: 'Successfully deleted the organization-wide system prompt',
  })
  @ApiResponse({
    status: 403,
    description: 'User is not an organization admin',
  })
  async deleteOrgSystemPrompt(): Promise<void> {
    await this.deleteOrgSystemPromptUseCase.execute();
  }
}
