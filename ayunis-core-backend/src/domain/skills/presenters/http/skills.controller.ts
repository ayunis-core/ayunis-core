import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Patch,
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
  ApiConsumes,
} from '@nestjs/swagger';
import {
  CurrentUser,
  UserProperty,
} from 'src/iam/authentication/application/decorators/current-user.decorator';

// Use Cases
import { CreateSkillUseCase } from '../../application/use-cases/create-skill/create-skill.use-case';
import { UpdateSkillUseCase } from '../../application/use-cases/update-skill/update-skill.use-case';
import { DeleteSkillUseCase } from '../../application/use-cases/delete-skill/delete-skill.use-case';
import { FindOneSkillUseCase } from '../../application/use-cases/find-one-skill/find-one-skill.use-case';
import { FindAllSkillsUseCase } from '../../application/use-cases/find-all-skills/find-all-skills.use-case';
import { ToggleSkillActiveUseCase } from '../../application/use-cases/toggle-skill-active/toggle-skill-active.use-case';
import { AddSourceToSkillUseCase } from '../../application/use-cases/add-source-to-skill/add-source-to-skill.use-case';
import { RemoveSourceFromSkillUseCase } from '../../application/use-cases/remove-source-from-skill/remove-source-from-skill.use-case';
import { ListSkillSourcesUseCase } from '../../application/use-cases/list-skill-sources/list-skill-sources.use-case';
import { AssignMcpIntegrationToSkillUseCase } from '../../application/use-cases/assign-mcp-integration-to-skill/assign-mcp-integration-to-skill.use-case';
import { UnassignMcpIntegrationFromSkillUseCase } from '../../application/use-cases/unassign-mcp-integration-from-skill/unassign-mcp-integration-from-skill.use-case';
import { ListSkillMcpIntegrationsUseCase } from '../../application/use-cases/list-skill-mcp-integrations/list-skill-mcp-integrations.use-case';

// Commands & Queries
import { CreateSkillCommand } from '../../application/use-cases/create-skill/create-skill.command';
import { UpdateSkillCommand } from '../../application/use-cases/update-skill/update-skill.command';
import { DeleteSkillCommand } from '../../application/use-cases/delete-skill/delete-skill.command';
import { FindOneSkillQuery } from '../../application/use-cases/find-one-skill/find-one-skill.query';
import { FindAllSkillsQuery } from '../../application/use-cases/find-all-skills/find-all-skills.query';
import { ToggleSkillActiveCommand } from '../../application/use-cases/toggle-skill-active/toggle-skill-active.command';
import { AddSourceToSkillCommand } from '../../application/use-cases/add-source-to-skill/add-source-to-skill.command';
import { RemoveSourceFromSkillCommand } from '../../application/use-cases/remove-source-from-skill/remove-source-from-skill.command';
import { ListSkillSourcesQuery } from '../../application/use-cases/list-skill-sources/list-skill-sources.query';
import { AssignMcpIntegrationToSkillCommand } from '../../application/use-cases/assign-mcp-integration-to-skill/assign-mcp-integration-to-skill.command';
import { UnassignMcpIntegrationFromSkillCommand } from '../../application/use-cases/unassign-mcp-integration-from-skill/unassign-mcp-integration-from-skill.command';
import { ListSkillMcpIntegrationsQuery } from '../../application/use-cases/list-skill-mcp-integrations/list-skill-mcp-integrations.query';

// Ports
import { SkillRepository } from '../../application/ports/skill.repository';

// DTOs & Mappers
import { CreateSkillDto } from './dto/create-skill.dto';
import { UpdateSkillDto } from './dto/update-skill.dto';
import {
  SkillResponseDto,
  SkillSourceResponseDto,
} from './dto/skill-response.dto';
import { SkillDtoMapper } from './mappers/skill.mapper';
import { McpIntegrationResponseDto } from 'src/domain/mcp/presenters/http/dto/mcp-integration-response.dto';
import { McpIntegrationDtoMapper } from 'src/domain/mcp/presenters/http/mappers/mcp-integration-dto.mapper';

// File handling
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import { Transactional } from '@nestjs-cls/transactional';
import { CreateFileSourceCommand } from 'src/domain/sources/application/use-cases/create-text-source/create-text-source.command';
import { CreateTextSourceUseCase } from 'src/domain/sources/application/use-cases/create-text-source/create-text-source.use-case';
import { CreateCSVDataSourceCommand } from 'src/domain/sources/application/use-cases/create-data-source/create-data-source.command';
import { CreateDataSourceUseCase } from 'src/domain/sources/application/use-cases/create-data-source/create-data-source.use-case';
import { Source } from 'src/domain/sources/domain/source.entity';
import { Skill } from '../../domain/skill.entity';
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
} from '../../application/skills.errors';
import { parseCSV } from 'src/common/util/csv';
import { parseExcel } from 'src/common/util/excel';

@ApiTags('skills')
@Controller('skills')
export class SkillsController {
  private readonly logger = new Logger(SkillsController.name);

  constructor(
    private readonly createSkillUseCase: CreateSkillUseCase,
    private readonly updateSkillUseCase: UpdateSkillUseCase,
    private readonly deleteSkillUseCase: DeleteSkillUseCase,
    private readonly findOneSkillUseCase: FindOneSkillUseCase,
    private readonly findAllSkillsUseCase: FindAllSkillsUseCase,
    private readonly toggleSkillActiveUseCase: ToggleSkillActiveUseCase,
    private readonly addSourceToSkillUseCase: AddSourceToSkillUseCase,
    private readonly removeSourceFromSkillUseCase: RemoveSourceFromSkillUseCase,
    private readonly listSkillSourcesUseCase: ListSkillSourcesUseCase,
    private readonly assignMcpIntegrationToSkillUseCase: AssignMcpIntegrationToSkillUseCase,
    private readonly unassignMcpIntegrationFromSkillUseCase: UnassignMcpIntegrationFromSkillUseCase,
    private readonly listSkillMcpIntegrationsUseCase: ListSkillMcpIntegrationsUseCase,
    private readonly skillDtoMapper: SkillDtoMapper,
    private readonly skillRepository: SkillRepository,
    private readonly createTextSourceUseCase: CreateTextSourceUseCase,
    private readonly createDataSourceUseCase: CreateDataSourceUseCase,
    private readonly mcpIntegrationDtoMapper: McpIntegrationDtoMapper,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new skill' })
  @ApiBody({ type: CreateSkillDto })
  @ApiResponse({
    status: 201,
    description: 'The skill has been successfully created',
    type: SkillResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid skill data' })
  @ApiResponse({
    status: 409,
    description: 'A skill with this name already exists',
  })
  async create(
    @CurrentUser(UserProperty.ID) userId: UUID,
    @Body() dto: CreateSkillDto,
  ): Promise<SkillResponseDto> {
    this.logger.log('create', { userId, name: dto.name });

    const skill = await this.createSkillUseCase.execute(
      new CreateSkillCommand({
        name: dto.name,
        shortDescription: dto.shortDescription,
        instructions: dto.instructions,
        isActive: dto.isActive,
      }),
    );

    return this.skillDtoMapper.toDto(skill, dto.isActive ?? false);
  }

  @Get()
  @ApiOperation({ summary: 'Get all skills for the current user' })
  @ApiResponse({
    status: 200,
    description: 'Returns all skills for the current user',
    type: [SkillResponseDto],
  })
  async findAll(
    @CurrentUser(UserProperty.ID) userId: UUID,
  ): Promise<SkillResponseDto[]> {
    this.logger.log('findAll', { userId });

    const skills = await this.findAllSkillsUseCase.execute(
      new FindAllSkillsQuery(),
    );

    const activeSkillIds = await this.skillRepository.getActiveSkillIds(userId);

    return this.skillDtoMapper.toDtoArray(skills, activeSkillIds);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a skill by ID' })
  @ApiParam({
    name: 'id',
    description: 'The UUID of the skill to retrieve',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the skill with the specified ID',
    type: SkillResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Skill not found' })
  async findOne(
    @CurrentUser(UserProperty.ID) userId: UUID,
    @Param('id', ParseUUIDPipe) id: UUID,
  ): Promise<SkillResponseDto> {
    this.logger.log('findOne', { id, userId });

    const skill = await this.findOneSkillUseCase.execute(
      new FindOneSkillQuery(id),
    );

    const isActive = await this.skillRepository.isSkillActive(id, userId);

    return this.skillDtoMapper.toDto(skill, isActive);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a skill' })
  @ApiParam({
    name: 'id',
    description: 'The UUID of the skill to update',
    type: 'string',
    format: 'uuid',
  })
  @ApiBody({ type: UpdateSkillDto })
  @ApiResponse({
    status: 200,
    description: 'The skill has been successfully updated',
    type: SkillResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Skill not found' })
  @ApiResponse({ status: 400, description: 'Invalid skill data' })
  @ApiResponse({
    status: 409,
    description: 'A skill with this name already exists',
  })
  async update(
    @CurrentUser(UserProperty.ID) userId: UUID,
    @Param('id', ParseUUIDPipe) id: UUID,
    @Body() dto: UpdateSkillDto,
  ): Promise<SkillResponseDto> {
    this.logger.log('update', { id, userId, name: dto.name });

    const skill = await this.updateSkillUseCase.execute(
      new UpdateSkillCommand({
        skillId: id,
        name: dto.name,
        shortDescription: dto.shortDescription,
        instructions: dto.instructions,
      }),
    );

    const isActive = await this.skillRepository.isSkillActive(id, userId);

    return this.skillDtoMapper.toDto(skill, isActive);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a skill' })
  @ApiParam({
    name: 'id',
    description: 'The UUID of the skill to delete',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 204,
    description: 'The skill has been successfully deleted',
  })
  @ApiResponse({ status: 404, description: 'Skill not found' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id', ParseUUIDPipe) id: UUID): Promise<void> {
    this.logger.log('delete', { id });

    await this.deleteSkillUseCase.execute(
      new DeleteSkillCommand({ skillId: id }),
    );
  }

  @Patch(':id/toggle-active')
  @ApiOperation({ summary: 'Toggle skill active/inactive status' })
  @ApiParam({
    name: 'id',
    description: 'The UUID of the skill to toggle',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'The skill active status has been toggled',
    type: SkillResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Skill not found' })
  async toggleActive(
    @CurrentUser(UserProperty.ID) userId: UUID,
    @Param('id', ParseUUIDPipe) id: UUID,
  ): Promise<SkillResponseDto> {
    this.logger.log('toggleActive', { id, userId });

    const { skill, isActive } = await this.toggleSkillActiveUseCase.execute(
      new ToggleSkillActiveCommand({ skillId: id }),
    );

    return this.skillDtoMapper.toDto(skill, isActive);
  }

  // Source Management

  @Get(':id/sources')
  @ApiOperation({ summary: 'Get all sources for a skill' })
  @ApiParam({
    name: 'id',
    description: 'The UUID of the skill',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns all sources for the skill',
    type: [SkillSourceResponseDto],
  })
  @ApiResponse({ status: 404, description: 'Skill not found' })
  async getSkillSources(
    @CurrentUser(UserProperty.ID) userId: UUID,
    @Param('id', ParseUUIDPipe) skillId: UUID,
  ): Promise<SkillSourceResponseDto[]> {
    this.logger.log('getSkillSources', { skillId, userId });

    const sources = await this.listSkillSourcesUseCase.execute(
      new ListSkillSourcesQuery(skillId),
    );

    return this.skillDtoMapper.sourcesToDtoArray(sources);
  }

  @Post(':id/sources/file')
  @ApiOperation({ summary: 'Add a file source to a skill' })
  @ApiParam({
    name: 'id',
    description: 'The UUID of the skill',
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
    description: 'The file source has been successfully added to the skill',
    type: SkillResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Skill not found' })
  @ApiResponse({
    status: 400,
    description: 'Invalid or unsupported file type',
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
  @Transactional()
  async addFileSource(
    @CurrentUser(UserProperty.ID) userId: UUID,
    @Param('id', ParseUUIDPipe) skillId: UUID,
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
  ): Promise<SkillResponseDto> {
    if (!file) {
      throw new MissingFileError();
    }

    this.logger.log('addFileSource', {
      skillId,
      userId,
      fileName: file.originalname,
    });
    try {
      const sources: Source[] = [];
      const detectedType = detectFileType(file.mimetype, file.originalname);

      if (isDocumentFile(detectedType)) {
        const fileData = fs.readFileSync(file.path);
        const canonicalMimeType = getCanonicalMimeType(detectedType)!;

        const source = await this.createTextSourceUseCase.execute(
          new CreateFileSourceCommand({
            fileType: canonicalMimeType,
            fileData: fileData,
            fileName: file.originalname,
          }),
        );
        sources.push(source);
      } else if (isCSVFile(detectedType)) {
        const fileData = fs.readFileSync(file.path, 'utf8');
        const { headers, data } = parseCSV(fileData);
        const source = await this.createDataSourceUseCase.execute(
          new CreateCSVDataSourceCommand({
            name: file.originalname,
            data: { headers, rows: data },
          }),
        );
        sources.push(source);
      } else if (isSpreadsheetFile(detectedType)) {
        const fileData = fs.readFileSync(file.path);
        const sheets = parseExcel(fileData);

        if (sheets.length === 0) {
          throw new EmptyFileDataError(file.originalname);
        }

        const baseFileName = file.originalname.replace(/\.(xlsx|xls)$/i, '');

        for (const sheet of sheets) {
          const sourceName =
            sheets.length === 1
              ? `${baseFileName}.csv`
              : `${baseFileName}_${sheet.sheetName.replace(/\s+/g, '_')}.csv`;

          const source = await this.createDataSourceUseCase.execute(
            new CreateCSVDataSourceCommand({
              name: sourceName,
              data: { headers: sheet.headers, rows: sheet.rows },
            }),
          );
          sources.push(source);
        }
      } else {
        throw new UnsupportedFileTypeError(
          detectedType === 'unknown' ? file.originalname : detectedType,
          ['PDF', 'DOCX', 'PPTX', 'CSV', 'XLSX', 'XLS'],
        );
      }

      let updatedSkill: Skill | undefined;
      for (const source of sources) {
        updatedSkill = await this.addSourceToSkillUseCase.execute(
          new AddSourceToSkillCommand({ skillId, sourceId: source.id }),
        );
      }

      fs.unlinkSync(file.path);
      const isActive = await this.skillRepository.isSkillActive(
        skillId,
        userId,
      );
      return this.skillDtoMapper.toDto(updatedSkill!, isActive);
    } catch (error: unknown) {
      this.logger.error('addFileSource', { error: error as Error });
      fs.unlinkSync(file.path);
      throw error;
    }
  }

  @Delete(':id/sources/:sourceId')
  @ApiOperation({ summary: 'Remove a source from a skill' })
  @ApiParam({
    name: 'id',
    description: 'The UUID of the skill',
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
    description: 'The source has been successfully removed from the skill',
  })
  @ApiResponse({
    status: 404,
    description: 'Skill or source not found',
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeSource(
    @CurrentUser(UserProperty.ID) userId: UUID,
    @Param('id', ParseUUIDPipe) skillId: UUID,
    @Param('sourceId', ParseUUIDPipe) sourceId: UUID,
  ): Promise<void> {
    this.logger.log('removeSource', { skillId, sourceId, userId });

    await this.removeSourceFromSkillUseCase.execute(
      new RemoveSourceFromSkillCommand({ skillId, sourceId }),
    );
  }

  // MCP Integration Management

  @Post(':skillId/mcp-integrations/:integrationId')
  @ApiOperation({ summary: 'Assign MCP integration to skill' })
  @ApiParam({
    name: 'skillId',
    description: 'The UUID of the skill',
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
    type: SkillResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Skill or integration not found' })
  @ApiResponse({ status: 409, description: 'Integration already assigned' })
  @HttpCode(HttpStatus.CREATED)
  async assignMcpIntegration(
    @CurrentUser(UserProperty.ID) userId: UUID,
    @Param('skillId', ParseUUIDPipe) skillId: UUID,
    @Param('integrationId', ParseUUIDPipe) integrationId: UUID,
  ): Promise<SkillResponseDto> {
    this.logger.log('assignMcpIntegration', { skillId, integrationId });

    const skill = await this.assignMcpIntegrationToSkillUseCase.execute(
      new AssignMcpIntegrationToSkillCommand(skillId, integrationId),
    );

    const isActive = await this.skillRepository.isSkillActive(skillId, userId);

    return this.skillDtoMapper.toDto(skill, isActive);
  }

  @Delete(':skillId/mcp-integrations/:integrationId')
  @ApiOperation({ summary: 'Unassign MCP integration from skill' })
  @ApiParam({
    name: 'skillId',
    description: 'The UUID of the skill',
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
    type: SkillResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Skill not found or integration not assigned',
  })
  async unassignMcpIntegration(
    @CurrentUser(UserProperty.ID) userId: UUID,
    @Param('skillId', ParseUUIDPipe) skillId: UUID,
    @Param('integrationId', ParseUUIDPipe) integrationId: UUID,
  ): Promise<SkillResponseDto> {
    this.logger.log('unassignMcpIntegration', { skillId, integrationId });

    const skill = await this.unassignMcpIntegrationFromSkillUseCase.execute(
      new UnassignMcpIntegrationFromSkillCommand(skillId, integrationId),
    );

    const isActive = await this.skillRepository.isSkillActive(skillId, userId);

    return this.skillDtoMapper.toDto(skill, isActive);
  }

  @Get(':skillId/mcp-integrations')
  @ApiOperation({ summary: 'List MCP integrations assigned to skill' })
  @ApiParam({
    name: 'skillId',
    description: 'The UUID of the skill',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns all MCP integrations assigned to the skill',
    type: [McpIntegrationResponseDto],
  })
  @ApiResponse({ status: 404, description: 'Skill not found' })
  async listSkillMcpIntegrations(
    @Param('skillId', ParseUUIDPipe) skillId: UUID,
  ): Promise<McpIntegrationResponseDto[]> {
    this.logger.log('listSkillMcpIntegrations', { skillId });

    const integrations = await this.listSkillMcpIntegrationsUseCase.execute(
      new ListSkillMcpIntegrationsQuery(skillId),
    );

    return this.mcpIntegrationDtoMapper.toDtoArray(integrations);
  }
}
