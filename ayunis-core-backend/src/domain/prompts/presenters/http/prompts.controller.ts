import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Body,
  ParseUUIDPipe,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UUID } from 'crypto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import {
  CurrentUser,
  UserProperty,
} from 'src/iam/authentication/application/decorators/current-user.decorator';

// Import use cases
import { CreatePromptUseCase } from '../../application/use-cases/create-prompt/create-prompt.use-case';
import { UpdatePromptUseCase } from '../../application/use-cases/update-prompt/update-prompt.use-case';
import { DeletePromptUseCase } from '../../application/use-cases/delete-prompt/delete-prompt.use-case';
import { GetPromptUseCase } from '../../application/use-cases/get-prompt/get-prompt.use-case';
import { GetAllPromptsByUserUseCase } from '../../application/use-cases/get-all-prompts-by-user/get-all-prompts-by-user.use-case';

// Import commands and queries
import { CreatePromptCommand } from '../../application/use-cases/create-prompt/create-prompt.command';
import { UpdatePromptCommand } from '../../application/use-cases/update-prompt/update-prompt.command';
import { DeletePromptCommand } from '../../application/use-cases/delete-prompt/delete-prompt.command';
import { GetPromptQuery } from '../../application/use-cases/get-prompt/get-prompt.query';
import { GetAllPromptsByUserQuery } from '../../application/use-cases/get-all-prompts-by-user/get-all-prompts-by-user.query';

// Import DTOs and mappers
import { CreatePromptDto } from './dto/create-prompt.dto';
import { UpdatePromptDto } from './dto/update-prompt.dto';
import { PromptResponseDto } from './dto/prompt-response.dto';
import { PromptDtoMapper } from './mappers/prompt.mapper';
import { RequireFeature } from 'src/common/guards/feature.guard';
import { FeatureFlag } from 'src/config/features.config';

@ApiTags('prompts')
@RequireFeature(FeatureFlag.Prompts)
@Controller('prompts')
export class PromptsController {
  private readonly logger = new Logger(PromptsController.name);

  constructor(
    private readonly createPromptUseCase: CreatePromptUseCase,
    private readonly updatePromptUseCase: UpdatePromptUseCase,
    private readonly deletePromptUseCase: DeletePromptUseCase,
    private readonly getPromptUseCase: GetPromptUseCase,
    private readonly getAllPromptsByUserUseCase: GetAllPromptsByUserUseCase,
    private readonly promptDtoMapper: PromptDtoMapper,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new prompt' })
  @ApiBody({ type: CreatePromptDto })
  @ApiResponse({
    status: 201,
    description: 'The prompt has been successfully created',
    type: PromptResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid prompt data' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async create(
    @CurrentUser(UserProperty.ID) userId: UUID,
    @Body() createPromptDto: CreatePromptDto,
  ): Promise<PromptResponseDto> {
    const prompt = await this.createPromptUseCase.execute(
      new CreatePromptCommand(
        createPromptDto.title,
        createPromptDto.content,
        userId,
      ),
    );

    return this.promptDtoMapper.toDto(prompt);
  }

  @Get()
  @ApiOperation({ summary: 'Get all prompts for the current user' })
  @ApiResponse({
    status: 200,
    description: 'Returns all prompts for the current user',
    type: [PromptResponseDto],
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async findAll(
    @CurrentUser(UserProperty.ID) userId: UUID,
  ): Promise<PromptResponseDto[]> {
    const prompts = await this.getAllPromptsByUserUseCase.execute(
      new GetAllPromptsByUserQuery(userId),
    );

    return this.promptDtoMapper.toDtoArray(prompts);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a prompt by ID' })
  @ApiParam({
    name: 'id',
    description: 'The UUID of the prompt to retrieve',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the prompt with the specified ID',
    type: PromptResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Prompt not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async findOne(
    @CurrentUser(UserProperty.ID) userId: UUID,
    @Param('id', ParseUUIDPipe) id: UUID,
  ): Promise<PromptResponseDto> {
    const prompt = await this.getPromptUseCase.execute(
      new GetPromptQuery(id, userId),
    );

    return this.promptDtoMapper.toDto(prompt);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a prompt' })
  @ApiParam({
    name: 'id',
    description: 'The UUID of the prompt to update',
    type: 'string',
    format: 'uuid',
  })
  @ApiBody({ type: UpdatePromptDto })
  @ApiResponse({
    status: 200,
    description: 'The prompt has been successfully updated',
    type: PromptResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Prompt not found' })
  @ApiResponse({ status: 400, description: 'Invalid prompt data' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async update(
    @CurrentUser(UserProperty.ID) userId: UUID,
    @Param('id', ParseUUIDPipe) id: UUID,
    @Body() updatePromptDto: UpdatePromptDto,
  ): Promise<PromptResponseDto> {
    const prompt = await this.updatePromptUseCase.execute(
      new UpdatePromptCommand(
        id,
        updatePromptDto.title,
        updatePromptDto.content,
        userId,
      ),
    );

    return this.promptDtoMapper.toDto(prompt);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a prompt' })
  @ApiParam({
    name: 'id',
    description: 'The UUID of the prompt to delete',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 204,
    description: 'The prompt has been successfully deleted',
  })
  @ApiResponse({ status: 404, description: 'Prompt not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @CurrentUser(UserProperty.ID) userId: UUID,
    @Param('id', ParseUUIDPipe) id: UUID,
  ): Promise<void> {
    await this.deletePromptUseCase.execute(new DeletePromptCommand(id, userId));
  }
}
