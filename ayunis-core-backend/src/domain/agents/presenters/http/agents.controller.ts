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
  ApiExtraModels,
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

// Import commands and queries
import { CreateAgentCommand } from '../../application/use-cases/create-agent/create-agent.command';
import { UpdateAgentCommand } from '../../application/use-cases/update-agent/update-agent.command';
import { DeleteAgentCommand } from '../../application/use-cases/delete-agent/delete-agent.command';
import { GetAgentQuery } from '../../application/use-cases/get-agent/get-agent.query';
import { FindAllAgentsByOwnerQuery } from '../../application/use-cases/find-all-agents-by-owner/find-all-agents-by-owner.query';

// Import DTOs and mappers
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';
import { AgentResponseDto } from './dto/agent-response.dto';
import { AgentDtoMapper } from './mappers/agent.mapper';
import { ModelResponseDto } from 'src/domain/threads/presenters/http/dto/model-response-dto';

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
    private readonly agentDtoMapper: AgentDtoMapper,
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
        toolAssignments: [], // For now, no tools
        userId,
        orgId,
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
  @ApiExtraModels(ModelResponseDto)
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
      new GetAgentQuery({ id, userId }),
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
      new UpdateAgentCommand(
        id,
        updateAgentDto.name,
        updateAgentDto.instructions,
        updateAgentDto.modelId,
        userId,
        orgId,
      ),
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
    @Param('id', ParseUUIDPipe) id: UUID,
  ): Promise<void> {
    this.logger.log('delete', { id, userId });

    await this.deleteAgentUseCase.execute(new DeleteAgentCommand(id, userId));
  }
}
