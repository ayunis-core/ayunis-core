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
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';
import { UUID, randomUUID } from 'crypto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiExtraModels,
  ApiConsumes,
} from '@nestjs/swagger';
import {
  CurrentUser,
  UserProperty,
} from 'src/iam/authentication/application/decorators/current-user.decorator';

// Import use cases
import { CreateAgentUseCase } from '../../application/use-cases/create-agent/create-agent.use-case';
import { UpdateAgentUseCase } from '../../application/use-cases/update-agent/update-agent.use-case';
import { DeleteAgentUseCase } from '../../application/use-cases/delete-agent/delete-agent.use-case';
import { GetAgentUseCase } from '../../application/use-cases/get-agent/get-agent.use-case';
import { FindAllAgentsByOwnerUseCase } from '../../application/use-cases/find-all-agents-by-owner/find-all-agents-by-owner.use-case';
import { AddSourceToAgentUseCase } from '../../application/use-cases/add-source-to-agent/add-source-to-agent.use-case';
import { RemoveSourceFromAgentUseCase } from '../../application/use-cases/remove-source-from-agent/remove-source-from-agent.use-case';
import { GetAgentSourcesUseCase } from '../../application/use-cases/get-agent-sources/get-agent-sources.use-case';

// Import commands and queries
import { CreateAgentCommand } from '../../application/use-cases/create-agent/create-agent.command';
import { UpdateAgentCommand } from '../../application/use-cases/update-agent/update-agent.command';
import { DeleteAgentCommand } from '../../application/use-cases/delete-agent/delete-agent.command';
import { GetAgentQuery } from '../../application/use-cases/get-agent/get-agent.query';
import { FindAllAgentsByOwnerQuery } from '../../application/use-cases/find-all-agents-by-owner/find-all-agents-by-owner.query';
import { AddSourceToAgentCommand } from '../../application/use-cases/add-source-to-agent/add-source-to-agent.command';
import { RemoveSourceFromAgentCommand } from '../../application/use-cases/remove-source-from-agent/remove-source-from-agent.command';
import { GetAgentSourcesQuery } from '../../application/use-cases/get-agent-sources/get-agent-sources.query';

// Import DTOs and mappers
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';
import {
  AgentResponseDto,
  ToolResponseDto,
  ModelResponseDto,
} from './dto/agent-response.dto';
import { AgentDtoMapper } from './mappers/agent.mapper';

// Import source-related dependencies
import { CreateFileSourceCommand } from '../../../sources/application/use-cases/create-file-source/create-file-source.command';
import { CreateFileSourceUseCase } from '../../../sources/application/use-cases/create-file-source/create-file-source.use-case';
import { GetAgentUseCase as FindAgentUseCase } from '../../application/use-cases/get-agent/get-agent.use-case';
import { SourceResponseDto } from '../../../threads/presenters/http/dto/get-thread-response.dto/source-response.dto';
import { SourceDtoMapper } from '../../../threads/presenters/http/mappers/source.mapper';

@ApiTags('agents')
@Controller('agents')
export class AgentsController {
  private readonly logger = new Logger(AgentsController.name);

  constructor(
    private readonly createAgentUseCase: CreateAgentUseCase,
    private readonly updateAgentUseCase: UpdateAgentUseCase,
    private readonly deleteAgentUseCase: DeleteAgentUseCase,
    private readonly findAgentUseCase: GetAgentUseCase,
    private readonly findAllAgentsByOwnerUseCase: FindAllAgentsByOwnerUseCase,
    private readonly addSourceToAgentUseCase: AddSourceToAgentUseCase,
    private readonly removeSourceFromAgentUseCase: RemoveSourceFromAgentUseCase,
    private readonly getAgentSourcesUseCase: GetAgentSourcesUseCase,
    private readonly createFileSourceUseCase: CreateFileSourceUseCase,
    private readonly agentDtoMapper: AgentDtoMapper,
    private readonly sourceDtoMapper: SourceDtoMapper,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new agent' })
  @ApiBody({ type: CreateAgentDto })
  @ApiResponse({
    status: 201,
    description: 'The agent has been successfully created',
    type: AgentResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid agent data' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async create(
    @CurrentUser(UserProperty.ID) userId: UUID,
    @CurrentUser(UserProperty.ORG_ID) orgId: UUID,
    @Body() createAgentDto: CreateAgentDto,
  ): Promise<AgentResponseDto> {
    this.logger.log('create', {
      userId,
      orgId,
      name: createAgentDto.name,
    });

    const agent = await this.createAgentUseCase.execute(
      new CreateAgentCommand({
        name: createAgentDto.name,
        instructions: createAgentDto.instructions,
        modelId: createAgentDto.modelId,
        toolAssignments: createAgentDto.toolAssignments.map(
          (toolAssignment) => ({
            toolType: toolAssignment.type,
            toolConfigId: toolAssignment.toolConfigId ?? null,
          }),
        ),
      }),
    );

    return this.agentDtoMapper.toDto(agent);
  }

  @Get()
  @ApiOperation({ summary: 'Get all agents for the current user' })
  @ApiResponse({
    status: 200,
    description: 'Returns all agents for the current user',
    type: [AgentResponseDto],
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @ApiExtraModels(ModelResponseDto, ToolResponseDto)
  async findAll(
    @CurrentUser(UserProperty.ID) userId: UUID,
  ): Promise<AgentResponseDto[]> {
    this.logger.log('findAll', { userId });

    const agents = await this.findAllAgentsByOwnerUseCase.execute(
      new FindAllAgentsByOwnerQuery(userId),
    );

    return this.agentDtoMapper.toDtoArray(agents);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an agent by ID' })
  @ApiParam({
    name: 'id',
    description: 'The UUID of the agent to retrieve',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the agent with the specified ID',
    type: AgentResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Agent not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async findOne(
    @CurrentUser(UserProperty.ID) userId: UUID,
    @Param('id', ParseUUIDPipe) id: UUID,
  ): Promise<AgentResponseDto> {
    this.logger.log('findOne', { id, userId });

    const agent = await this.findAgentUseCase.execute(
      new GetAgentQuery({ id }),
    );

    return this.agentDtoMapper.toDto(agent);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an agent' })
  @ApiParam({
    name: 'id',
    description: 'The UUID of the agent to update',
    type: 'string',
    format: 'uuid',
  })
  @ApiBody({ type: UpdateAgentDto })
  @ApiResponse({
    status: 200,
    description: 'The agent has been successfully updated',
    type: AgentResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Agent not found' })
  @ApiResponse({ status: 400, description: 'Invalid agent data' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async update(
    @CurrentUser(UserProperty.ID) userId: UUID,
    @CurrentUser(UserProperty.ORG_ID) orgId: UUID,
    @Param('id', ParseUUIDPipe) id: UUID,
    @Body() updateAgentDto: UpdateAgentDto,
  ): Promise<AgentResponseDto> {
    this.logger.log('update', {
      id,
      userId,
      orgId,
      name: updateAgentDto.name,
    });

    const agent = await this.updateAgentUseCase.execute(
      new UpdateAgentCommand({
        agentId: id,
        name: updateAgentDto.name,
        instructions: updateAgentDto.instructions,
        modelId: updateAgentDto.modelId,
        toolAssignments: updateAgentDto.toolAssignments.map(
          (toolAssignment) => ({
            id: toolAssignment.id,
            toolType: toolAssignment.type,
            toolConfigId: toolAssignment.toolConfigId ?? null,
            isEnabled: toolAssignment.isEnabled,
          }),
        ),
      }),
    );

    return this.agentDtoMapper.toDto(agent);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an agent' })
  @ApiParam({
    name: 'id',
    description: 'The UUID of the agent to delete',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 204,
    description: 'The agent has been successfully deleted',
  })
  @ApiResponse({ status: 404, description: 'Agent not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @CurrentUser(UserProperty.ID) userId: UUID,
    @CurrentUser(UserProperty.ORG_ID) orgId: UUID,
    @Param('id', ParseUUIDPipe) id: UUID,
  ): Promise<void> {
    this.logger.log('delete', { id, userId });

    await this.deleteAgentUseCase.execute(
      new DeleteAgentCommand({ agentId: id, userId, orgId }),
    );
  }

  // Source Management Endpoints

  @Get(':id/sources')
  @ApiOperation({ summary: 'Get all sources for an agent' })
  @ApiParam({
    name: 'id',
    description: 'The UUID of the agent',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns all sources for the agent',
    type: [SourceResponseDto],
  })
  @ApiResponse({ status: 404, description: 'Agent not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getAgentSources(
    @Param('id', ParseUUIDPipe) agentId: UUID,
  ): Promise<SourceResponseDto[]> {
    this.logger.log('getAgentSources', { agentId });
    const sources = await this.getAgentSourcesUseCase.execute(
      new GetAgentSourcesQuery(agentId),
    );
    return sources.map((source) =>
      this.sourceDtoMapper.toDto(source, agentId),
    );
  }

  @Post(':id/sources/file')
  @ApiOperation({ summary: 'Add a file source to an agent' })
  @ApiParam({
    name: 'id',
    description: 'The UUID of the agent',
    type: 'string',
    format: 'uuid',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'The file to upload',
        },
        name: {
          type: 'string',
          description: 'The display name for the file source',
        },
        description: {
          type: 'string',
          description: 'A description of the file source',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'The file source has been successfully added to the agent',
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const randomName = randomUUID();
          cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  async addFileSource(
    @CurrentUser(UserProperty.ID) userId: UUID,
    @CurrentUser(UserProperty.ORG_ID) orgId: UUID,
    @Param('id', ParseUUIDPipe) agentId: UUID,
    @Body() addFileSourceDto: any, // We can create a proper DTO later
    @UploadedFile()
    file: {
      fieldname: string;
      originalname: string;
      encoding: string;
      mimetype: string;
      size: number;
      buffer: Buffer;
      path: string;
    },
  ): Promise<void> {
    this.logger.log('addFileSource', { agentId, fileName: file.originalname });
    try {
      // Read file data from disk since we're using diskStorage
      const fileData = fs.readFileSync(file.path);

      // Create the file source
      const createFileSourceCommand = new CreateFileSourceCommand({
        orgId,
        fileType: file.mimetype,
        fileSize: file.size,
        fileData: fileData,
        fileName: file.originalname,
      });

      const fileSource = await this.createFileSourceUseCase.execute(
        createFileSourceCommand,
      );

      // Get the agent
      const agent = await this.findAgentUseCase.execute(
        new GetAgentQuery({ id: agentId }),
      );

      // Add the source to the agent
      await this.addSourceToAgentUseCase.execute(
        new AddSourceToAgentCommand(agent, fileSource),
      );

      // Clean up the uploaded file
      fs.unlinkSync(file.path);
      return;
    } catch (error: unknown) {
      this.logger.error('addFileSource', { error });
      // Clean up the uploaded file
      fs.unlinkSync(file.path);
      throw error;
    }
  }

  @Delete(':id/sources/:sourceId')
  @ApiOperation({ summary: 'Remove a source from an agent' })
  @ApiParam({
    name: 'id',
    description: 'The UUID of the agent',
    type: 'string',
    format: 'uuid',
  })
  @ApiParam({
    name: 'sourceId',
    description: 'The UUID of the source to remove',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 204,
    description: 'The source has been successfully removed from the agent',
  })
  @ApiResponse({ status: 404, description: 'Agent or source not found' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeSource(
    @CurrentUser(UserProperty.ID) userId: UUID,
    @Param('id', ParseUUIDPipe) agentId: UUID,
    @Param('sourceId', ParseUUIDPipe) sourceId: UUID,
  ): Promise<void> {
    this.logger.log('removeSource', { agentId, sourceId });

    // First get the agent
    const agent = await this.findAgentUseCase.execute(
      new GetAgentQuery({ id: agentId }),
    );

    // Remove the source from the agent
    await this.removeSourceFromAgentUseCase.execute(
      new RemoveSourceFromAgentCommand(agent, sourceId),
    );
  }
}
