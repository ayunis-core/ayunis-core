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
import { UUID } from 'crypto';
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
import { InstallAgentFromMarketplaceUseCase } from '../../application/use-cases/install-agent-from-marketplace/install-agent-from-marketplace.use-case';
import { InstallAgentFromMarketplaceCommand } from '../../application/use-cases/install-agent-from-marketplace/install-agent-from-marketplace.command';
import { CreateAgentUseCase } from '../../application/use-cases/create-agent/create-agent.use-case';
import { UpdateAgentUseCase } from '../../application/use-cases/update-agent/update-agent.use-case';
import { DeleteAgentUseCase } from '../../application/use-cases/delete-agent/delete-agent.use-case';
import { FindOneAgentUseCase } from '../../application/use-cases/find-one-agent/find-one-agent.use-case';
import { FindAllAgentsUseCase } from '../../application/use-cases/find-all-agents/find-all-agents.use-case';
import { AddSourceToAgentUseCase } from '../../application/use-cases/add-source-to-agent/add-source-to-agent.use-case';
import { RemoveSourceFromAgentUseCase } from '../../application/use-cases/remove-source-from-agent/remove-source-from-agent.use-case';
import { AssignMcpIntegrationToAgentUseCase } from '../../application/use-cases/assign-mcp-integration-to-agent/assign-mcp-integration-to-agent.use-case';

// Import commands and queries
import { CreateAgentCommand } from '../../application/use-cases/create-agent/create-agent.command';
import { UpdateAgentCommand } from '../../application/use-cases/update-agent/update-agent.command';
import { DeleteAgentCommand } from '../../application/use-cases/delete-agent/delete-agent.command';
import { FindOneAgentQuery } from '../../application/use-cases/find-one-agent/find-one-agent.query';
import { FindAllAgentsQuery } from '../../application/use-cases/find-all-agents/find-all-agents.query';
import { AddSourceToAgentCommand } from '../../application/use-cases/add-source-to-agent/add-source-to-agent.command';
import { RemoveSourceFromAgentCommand } from '../../application/use-cases/remove-source-from-agent/remove-source-from-agent.command';
import { AssignMcpIntegrationToAgentCommand } from '../../application/use-cases/assign-mcp-integration-to-agent/assign-mcp-integration-to-agent.command';
import { UnassignMcpIntegrationFromAgentUseCase } from '../../application/use-cases/unassign-mcp-integration-from-agent/unassign-mcp-integration-from-agent.use-case';
import { UnassignMcpIntegrationFromAgentCommand } from '../../application/use-cases/unassign-mcp-integration-from-agent/unassign-mcp-integration-from-agent.command';
import { ListAgentMcpIntegrationsUseCase } from '../../application/use-cases/list-agent-mcp-integrations/list-agent-mcp-integrations.use-case';
import { ListAgentMcpIntegrationsQuery } from '../../application/use-cases/list-agent-mcp-integrations/list-agent-mcp-integrations.query';

// Import DTOs and mappers
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';
import {
  AgentResponseDto,
  ToolResponseDto,
  ModelResponseDto,
} from './dto/agent-response.dto';
import { AgentDtoMapper } from './mappers/agent.mapper';
import { InstallAgentFromMarketplaceDto } from './dto/install-agent-from-marketplace.dto';
import { AddFileSourceToAgentDto } from './dto/add-file-source-to-agent.dto';
import { AgentSourceResponseDto } from './dto/agent-source-assignment-response.dto';
import { AgentSourceDtoMapper } from './mappers/agent-source.mapper';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import { Transactional } from '@nestjs-cls/transactional';
import { CreateFileSourceCommand } from 'src/domain/sources/application/use-cases/create-text-source/create-text-source.command';
import { CreateTextSourceUseCase } from 'src/domain/sources/application/use-cases/create-text-source/create-text-source.use-case';
import { McpIntegrationResponseDto } from 'src/domain/mcp/presenters/http/dto/mcp-integration-response.dto';
import { McpIntegrationDtoMapper } from 'src/domain/mcp/presenters/http/mappers/mcp-integration-dto.mapper';
import {
  detectFileType,
  getCanonicalMimeType,
  isDocumentFile,
  isSpreadsheetFile,
  isCSVFile,
} from 'src/common/util/file-type';
import {
  UnsupportedFileTypeError,
  EmptyFileDataError,
  MissingFileError,
} from '../../application/agents.errors';
import { CreateCSVDataSourceCommand } from 'src/domain/sources/application/use-cases/create-data-source/create-data-source.command';
import { CreateDataSourceUseCase } from 'src/domain/sources/application/use-cases/create-data-source/create-data-source.use-case';
import { parseCSV } from 'src/common/util/csv';
import { parseExcel } from 'src/common/util/excel';
import { Source } from 'src/domain/sources/domain/source.entity';
import { AgentSourceAssignment } from '../../domain/agent-source-assignment.entity';

@ApiTags('agents')
@Controller('agents')
export class AgentsController {
  private readonly logger = new Logger(AgentsController.name);

  constructor(
    private readonly installAgentFromMarketplaceUseCase: InstallAgentFromMarketplaceUseCase,
    private readonly createAgentUseCase: CreateAgentUseCase,
    private readonly updateAgentUseCase: UpdateAgentUseCase,
    private readonly deleteAgentUseCase: DeleteAgentUseCase,
    private readonly findOneAgentUseCase: FindOneAgentUseCase,
    private readonly findAllAgentsUseCase: FindAllAgentsUseCase,
    private readonly addSourceToAgentUseCase: AddSourceToAgentUseCase,
    private readonly removeSourceFromAgentUseCase: RemoveSourceFromAgentUseCase,
    private readonly assignMcpIntegrationToAgentUseCase: AssignMcpIntegrationToAgentUseCase,
    private readonly unassignMcpIntegrationFromAgentUseCase: UnassignMcpIntegrationFromAgentUseCase,
    private readonly listAgentMcpIntegrationsUseCase: ListAgentMcpIntegrationsUseCase,
    private readonly agentDtoMapper: AgentDtoMapper,
    private readonly agentSourceDtoMapper: AgentSourceDtoMapper,
    private readonly createTextSourceUseCase: CreateTextSourceUseCase,
    private readonly createDataSourceUseCase: CreateDataSourceUseCase,
    private readonly mcpIntegrationDtoMapper: McpIntegrationDtoMapper,
  ) {}

  @Post('install-from-marketplace')
  @ApiOperation({ summary: 'Install an agent from the marketplace' })
  @ApiBody({ type: InstallAgentFromMarketplaceDto })
  @ApiResponse({
    status: 201,
    description: 'The agent has been successfully installed from marketplace',
    type: AgentResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Marketplace agent not found',
  })
  async installFromMarketplace(
    @CurrentUser(UserProperty.ID) userId: UUID,
    @Body() dto: InstallAgentFromMarketplaceDto,
  ): Promise<AgentResponseDto> {
    this.logger.log('installFromMarketplace', {
      userId,
      identifier: dto.identifier,
    });

    const agent = await this.installAgentFromMarketplaceUseCase.execute(
      new InstallAgentFromMarketplaceCommand(dto.identifier),
    );

    return this.agentDtoMapper.toDto(agent);
  }

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

    const results = await this.findAllAgentsUseCase.execute(
      new FindAllAgentsQuery(),
    );

    return results.map((result) =>
      this.agentDtoMapper.toDto(result.agent, result.isShared),
    );
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

    const result = await this.findOneAgentUseCase.execute(
      new FindOneAgentQuery(id),
    );

    return this.agentDtoMapper.toDto(result.agent, result.isShared);
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
  async delete(@Param('id', ParseUUIDPipe) id: UUID): Promise<void> {
    this.logger.log('delete', { id });

    await this.deleteAgentUseCase.execute(
      new DeleteAgentCommand({ agentId: id }),
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
    type: [AgentSourceResponseDto],
  })
  @ApiResponse({ status: 404, description: 'Agent not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getAgentSources(
    @CurrentUser(UserProperty.ID) userId: UUID,
    @Param('id', ParseUUIDPipe) agentId: UUID,
  ): Promise<AgentSourceResponseDto[]> {
    this.logger.log('getAgentSources', { agentId, userId });

    const result = await this.findOneAgentUseCase.execute(
      new FindOneAgentQuery(agentId),
    );

    return this.agentSourceDtoMapper.toDtoArray(
      result.agent.sourceAssignments || [],
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
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'The file source has been successfully added to the agent',
  })
  @ApiResponse({ status: 404, description: 'Agent not found' })
  @ApiResponse({
    status: 400,
    description:
      'Invalid or unsupported file type. Supported types: PDF, DOCX, PPTX, CSV, XLSX, XLS',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        // TODO: Move this to a separate service
        destination: './uploads',
        filename: (req, file, cb) => {
          const randomName = randomUUID();
          cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  @Transactional()
  async addFileSource(
    @CurrentUser(UserProperty.ID) userId: UUID,
    @Param('id', ParseUUIDPipe) agentId: UUID,
    @Body() addFileSourceDto: AddFileSourceToAgentDto,
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
  ): Promise<AgentSourceResponseDto[]> {
    if (!file) {
      throw new MissingFileError();
    }

    this.logger.log('addFileSource', {
      agentId,
      userId,
      fileName: file.originalname,
    });
    try {
      const sources: Source[] = [];

      // Detect file type using centralized utility
      const detectedType = detectFileType(file.mimetype, file.originalname);
      this.logger.debug('File type detection', {
        mimetype: file.mimetype,
        originalname: file.originalname,
        detectedType,
      });

      if (isDocumentFile(detectedType)) {
        // Read file data from disk since we're using diskStorage
        const fileData = fs.readFileSync(file.path);
        const canonicalMimeType = getCanonicalMimeType(detectedType)!;

        // Create the file source
        const createFileSourceCommand = new CreateFileSourceCommand({
          fileType: canonicalMimeType,
          fileData: fileData,
          fileName: file.originalname,
        });

        const fileSource = await this.createTextSourceUseCase.execute(
          createFileSourceCommand,
        );
        sources.push(fileSource);
      } else if (isCSVFile(detectedType)) {
        const fileData = fs.readFileSync(file.path, 'utf8');
        const { headers, data } = parseCSV(fileData);
        const command = new CreateCSVDataSourceCommand({
          name: file.originalname,
          data: {
            headers,
            rows: data,
          },
        });
        const source = await this.createDataSourceUseCase.execute(command);
        sources.push(source);
      } else if (isSpreadsheetFile(detectedType)) {
        const fileData = fs.readFileSync(file.path);
        const sheets = parseExcel(fileData);

        // Validate that the file contains processable data
        if (sheets.length === 0) {
          throw new EmptyFileDataError(file.originalname);
        }

        // Get the base filename without extension
        const baseFileName = file.originalname.replace(/\.(xlsx|xls)$/i, '');

        for (const sheet of sheets) {
          // Create a source name: if single sheet, use filename; if multiple, include sheet name
          const sourceName =
            sheets.length === 1
              ? `${baseFileName}.csv`
              : `${baseFileName}_${sheet.sheetName.replace(/\s+/g, '_')}.csv`;

          const command = new CreateCSVDataSourceCommand({
            name: sourceName,
            data: {
              headers: sheet.headers,
              rows: sheet.rows,
            },
          });
          const source = await this.createDataSourceUseCase.execute(command);
          sources.push(source);
        }
      } else {
        throw new UnsupportedFileTypeError(
          detectedType === 'unknown' ? file.originalname : detectedType,
          ['PDF', 'DOCX', 'PPTX', 'CSV', 'XLSX', 'XLS'],
        );
      }

      // Add all sources to the agent
      const sourceAssignments: AgentSourceAssignment[] = [];
      for (const source of sources) {
        const sourceAssignment = await this.addSourceToAgentUseCase.execute(
          new AddSourceToAgentCommand({
            agentId,
            source: source,
          }),
        );
        sourceAssignments.push(sourceAssignment);
      }

      // Clean up the uploaded file
      fs.unlinkSync(file.path);
      return sourceAssignments.map((assignment) =>
        this.agentSourceDtoMapper.toDto(assignment),
      );
    } catch (error: unknown) {
      this.logger.error('addFileSource', { error });
      // Clean up the uploaded file
      fs.unlinkSync(file.path);
      throw error;
    }
  }

  @Delete(':id/sources/:sourceAssignmentId')
  @ApiOperation({ summary: 'Remove a source from an agent' })
  @ApiParam({
    name: 'id',
    description: 'The UUID of the agent',
    type: 'string',
    format: 'uuid',
  })
  @ApiParam({
    name: 'sourceAssignmentId',
    description: 'The UUID of the source assignment to remove',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 204,
    description: 'The source has been successfully removed from the agent',
  })
  @ApiResponse({
    status: 404,
    description: 'Agent or source assignment not found',
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeSource(
    @CurrentUser(UserProperty.ID) userId: UUID,
    @Param('id', ParseUUIDPipe) agentId: UUID,
    @Param('sourceAssignmentId', ParseUUIDPipe) sourceAssignmentId: UUID,
  ): Promise<void> {
    this.logger.log('removeSource', { agentId, sourceAssignmentId, userId });

    await this.removeSourceFromAgentUseCase.execute(
      new RemoveSourceFromAgentCommand({
        agentId,
        sourceAssignmentId,
      }),
    );
  }

  // MCP Integration Management Endpoints

  @Post(':agentId/mcp-integrations/:integrationId')
  @ApiOperation({ summary: 'Assign MCP integration to agent' })
  @ApiParam({
    name: 'agentId',
    description: 'The UUID of the agent',
    type: 'string',
    format: 'uuid',
  })
  @ApiParam({
    name: 'integrationId',
    description: 'The UUID of the MCP integration to assign',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 201,
    description: 'The MCP integration has been successfully assigned',
    type: AgentResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Integration disabled',
  })
  @ApiResponse({
    status: 403,
    description: 'Integration belongs to different organization',
  })
  @ApiResponse({
    status: 404,
    description: 'Agent or integration not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Integration already assigned',
  })
  @HttpCode(HttpStatus.CREATED)
  async assignMcpIntegration(
    @Param('agentId', ParseUUIDPipe) agentId: UUID,
    @Param('integrationId', ParseUUIDPipe) integrationId: UUID,
  ): Promise<AgentResponseDto> {
    this.logger.log('assignMcpIntegration', { agentId, integrationId });

    const agent = await this.assignMcpIntegrationToAgentUseCase.execute(
      new AssignMcpIntegrationToAgentCommand(agentId, integrationId),
    );

    return this.agentDtoMapper.toDto(agent);
  }

  @Delete(':agentId/mcp-integrations/:integrationId')
  @ApiOperation({ summary: 'Unassign MCP integration from agent' })
  @ApiParam({
    name: 'agentId',
    description: 'The UUID of the agent',
    type: 'string',
    format: 'uuid',
  })
  @ApiParam({
    name: 'integrationId',
    description: 'The UUID of the MCP integration to unassign',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'The MCP integration has been successfully unassigned',
    type: AgentResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Agent not found or integration not assigned',
  })
  async unassignMcpIntegration(
    @Param('agentId', ParseUUIDPipe) agentId: UUID,
    @Param('integrationId', ParseUUIDPipe) integrationId: UUID,
  ): Promise<AgentResponseDto> {
    this.logger.log('unassignMcpIntegration', { agentId, integrationId });

    const agent = await this.unassignMcpIntegrationFromAgentUseCase.execute(
      new UnassignMcpIntegrationFromAgentCommand(agentId, integrationId),
    );

    return this.agentDtoMapper.toDto(agent);
  }

  @Get(':agentId/mcp-integrations')
  @ApiOperation({ summary: 'List MCP integrations assigned to agent' })
  @ApiParam({
    name: 'agentId',
    description: 'The UUID of the agent',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns all MCP integrations assigned to the agent',
    type: [McpIntegrationResponseDto],
  })
  @ApiResponse({ status: 404, description: 'Agent not found' })
  async listAgentMcpIntegrations(
    @Param('agentId', ParseUUIDPipe) agentId: UUID,
  ): Promise<McpIntegrationResponseDto[]> {
    this.logger.log('listAgentMcpIntegrations', { agentId });

    const integrations = await this.listAgentMcpIntegrationsUseCase.execute(
      new ListAgentMcpIntegrationsQuery(agentId),
    );

    return this.mcpIntegrationDtoMapper.toDtoArray(integrations);
  }
}
