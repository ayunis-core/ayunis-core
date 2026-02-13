import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiOperation, ApiTags, ApiResponse, ApiBody } from '@nestjs/swagger';
import { GetUserSystemPromptUseCase } from '../../application/use-cases/get-user-system-prompt/get-user-system-prompt.use-case';
import { UpsertUserSystemPromptUseCase } from '../../application/use-cases/upsert-user-system-prompt/upsert-user-system-prompt.use-case';
import { UpsertUserSystemPromptCommand } from '../../application/use-cases/upsert-user-system-prompt/upsert-user-system-prompt.command';
import { DeleteUserSystemPromptUseCase } from '../../application/use-cases/delete-user-system-prompt/delete-user-system-prompt.use-case';
import { UpsertUserSystemPromptDto } from './dtos/upsert-user-system-prompt.dto';
import { UserSystemPromptResponseDto } from './dtos/user-system-prompt-response.dto';

@ApiTags('Chat Settings')
@Controller('chat-settings')
export class ChatSettingsController {
  private readonly logger = new Logger(ChatSettingsController.name);

  constructor(
    private readonly getUserSystemPromptUseCase: GetUserSystemPromptUseCase,
    private readonly upsertUserSystemPromptUseCase: UpsertUserSystemPromptUseCase,
    private readonly deleteUserSystemPromptUseCase: DeleteUserSystemPromptUseCase,
  ) {}

  @Get('system-prompt')
  @ApiOperation({
    summary: 'Get the user system prompt',
    description:
      'Returns the custom system prompt for the authenticated user, or null if not set.',
  })
  @ApiResponse({
    status: 200,
    description: 'The user system prompt',
    type: UserSystemPromptResponseDto,
  })
  async getSystemPrompt(): Promise<UserSystemPromptResponseDto> {
    const result = await this.getUserSystemPromptUseCase.execute();

    return {
      systemPrompt: result?.systemPrompt ?? null,
    };
  }

  @Put('system-prompt')
  @ApiOperation({
    summary: 'Set or update the user system prompt',
    description:
      'Creates or replaces the custom system prompt for the authenticated user.',
  })
  @ApiBody({ type: UpsertUserSystemPromptDto })
  @ApiResponse({
    status: 200,
    description: 'Successfully set or updated the user system prompt',
    type: UserSystemPromptResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request payload',
  })
  async upsertSystemPrompt(
    @Body() dto: UpsertUserSystemPromptDto,
  ): Promise<UserSystemPromptResponseDto> {
    const command = new UpsertUserSystemPromptCommand(dto.systemPrompt);
    const result = await this.upsertUserSystemPromptUseCase.execute(command);

    return {
      systemPrompt: result.systemPrompt,
    };
  }

  @Delete('system-prompt')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete the user system prompt',
    description: 'Deletes the custom system prompt for the authenticated user.',
  })
  @ApiResponse({
    status: 204,
    description: 'Successfully deleted the user system prompt',
  })
  async deleteSystemPrompt(): Promise<void> {
    await this.deleteUserSystemPromptUseCase.execute();
  }
}
