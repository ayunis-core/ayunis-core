import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiResponse,
  ApiUnauthorizedResponse,
  ApiInternalServerErrorResponse,
} from '@nestjs/swagger';
import type { UUID } from 'crypto';
import { SystemRoles } from 'src/iam/authorization/application/decorators/system-roles.decorator';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { CreateSkillTemplateUseCase } from '../../application/use-cases/create-skill-template/create-skill-template.use-case';
import { CreateSkillTemplateCommand } from '../../application/use-cases/create-skill-template/create-skill-template.command';
import { UpdateSkillTemplateUseCase } from '../../application/use-cases/update-skill-template/update-skill-template.use-case';
import { UpdateSkillTemplateCommand } from '../../application/use-cases/update-skill-template/update-skill-template.command';
import { DeleteSkillTemplateUseCase } from '../../application/use-cases/delete-skill-template/delete-skill-template.use-case';
import { DeleteSkillTemplateCommand } from '../../application/use-cases/delete-skill-template/delete-skill-template.command';
import { FindAllSkillTemplatesUseCase } from '../../application/use-cases/find-all-skill-templates/find-all-skill-templates.use-case';
import { FindOneSkillTemplateUseCase } from '../../application/use-cases/find-one-skill-template/find-one-skill-template.use-case';
import { FindAllSkillTemplatesQuery } from '../../application/use-cases/find-all-skill-templates/find-all-skill-templates.query';
import { FindOneSkillTemplateQuery } from '../../application/use-cases/find-one-skill-template/find-one-skill-template.query';
import { InvalidSkillTemplateNameError } from '../../domain/skill-template.entity';
import { CreateSkillTemplateDto } from './dto/create-skill-template.dto';
import { UpdateSkillTemplateDto } from './dto/update-skill-template.dto';
import { SkillTemplateResponseDto } from './dto/skill-template-response.dto';
import { SkillTemplateResponseMapper } from './mappers/skill-template-response.mapper';

@ApiTags('Super Admin Skill Templates')
@Controller('super-admin/skill-templates')
@SystemRoles(SystemRole.SUPER_ADMIN)
export class SuperAdminSkillTemplatesController {
  private readonly logger = new Logger(SuperAdminSkillTemplatesController.name);

  constructor(
    private readonly createSkillTemplateUseCase: CreateSkillTemplateUseCase,
    private readonly updateSkillTemplateUseCase: UpdateSkillTemplateUseCase,
    private readonly deleteSkillTemplateUseCase: DeleteSkillTemplateUseCase,
    private readonly findAllSkillTemplatesUseCase: FindAllSkillTemplatesUseCase,
    private readonly findOneSkillTemplateUseCase: FindOneSkillTemplateUseCase,
    private readonly responseMapper: SkillTemplateResponseMapper,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new skill template',
    description:
      'Create a new skill template. Only accessible to super admins.',
  })
  @ApiBody({ type: CreateSkillTemplateDto })
  @ApiCreatedResponse({
    description: 'Successfully created skill template',
    type: SkillTemplateResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Skill template with this name already exists',
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated or not authorized as super admin',
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error',
  })
  async create(
    @Body() dto: CreateSkillTemplateDto,
  ): Promise<SkillTemplateResponseDto> {
    this.logger.log(`Creating skill template: ${dto.name}`);

    try {
      const command = new CreateSkillTemplateCommand({
        name: dto.name,
        shortDescription: dto.shortDescription,
        instructions: dto.instructions,
        distributionMode: dto.distributionMode,
        isActive: dto.isActive,
        defaultActive: dto.defaultActive,
        defaultPinned: dto.defaultPinned,
      });

      const template = await this.createSkillTemplateUseCase.execute(command);

      this.logger.log(`Successfully created skill template ${template.id}`);
      return this.responseMapper.toDto(template);
    } catch (error) {
      if (error instanceof InvalidSkillTemplateNameError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all skill templates',
    description:
      'Retrieve all skill templates. Only accessible to super admins.',
  })
  @ApiOkResponse({
    description: 'Successfully retrieved skill templates',
    type: [SkillTemplateResponseDto],
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated or not authorized as super admin',
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error',
  })
  async findAll(): Promise<SkillTemplateResponseDto[]> {
    this.logger.log('Finding all skill templates');

    const templates = await this.findAllSkillTemplatesUseCase.execute(
      new FindAllSkillTemplatesQuery(),
    );

    this.logger.log(
      `Successfully retrieved ${templates.length} skill templates`,
    );
    return this.responseMapper.toDtoArray(templates);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get a skill template by ID',
    description:
      'Retrieve a specific skill template by its ID. Only accessible to super admins.',
  })
  @ApiParam({
    name: 'id',
    description: 'Skill template ID',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Successfully retrieved skill template',
    type: SkillTemplateResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Skill template not found',
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated or not authorized as super admin',
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error',
  })
  async findOne(
    @Param('id', ParseUUIDPipe) id: UUID,
  ): Promise<SkillTemplateResponseDto> {
    this.logger.log(`Finding skill template ${id}`);

    const template = await this.findOneSkillTemplateUseCase.execute(
      new FindOneSkillTemplateQuery(id),
    );

    this.logger.log(`Successfully retrieved skill template ${id}`);
    return this.responseMapper.toDto(template);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update a skill template',
    description:
      'Partially update an existing skill template. Only accessible to super admins.',
  })
  @ApiParam({
    name: 'id',
    description: 'Skill template ID',
    format: 'uuid',
  })
  @ApiBody({ type: UpdateSkillTemplateDto })
  @ApiOkResponse({
    description: 'Successfully updated skill template',
    type: SkillTemplateResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Skill template not found',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Skill template with this name already exists',
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated or not authorized as super admin',
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: UUID,
    @Body() dto: UpdateSkillTemplateDto,
  ): Promise<SkillTemplateResponseDto> {
    this.logger.log(`Updating skill template ${id}`);

    try {
      const command = new UpdateSkillTemplateCommand({
        skillTemplateId: id,
        name: dto.name,
        shortDescription: dto.shortDescription,
        instructions: dto.instructions,
        distributionMode: dto.distributionMode,
        isActive: dto.isActive,
        defaultActive: dto.defaultActive,
        defaultPinned: dto.defaultPinned,
      });

      const template = await this.updateSkillTemplateUseCase.execute(command);

      this.logger.log(`Successfully updated skill template ${id}`);
      return this.responseMapper.toDto(template);
    } catch (error) {
      if (error instanceof InvalidSkillTemplateNameError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a skill template',
    description: 'Delete a skill template. Only accessible to super admins.',
  })
  @ApiParam({
    name: 'id',
    description: 'Skill template ID',
    format: 'uuid',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Successfully deleted skill template',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Skill template not found',
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated or not authorized as super admin',
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error',
  })
  async delete(@Param('id', ParseUUIDPipe) id: UUID): Promise<void> {
    this.logger.log(`Deleting skill template ${id}`);

    await this.deleteSkillTemplateUseCase.execute(
      new DeleteSkillTemplateCommand({ skillTemplateId: id }),
    );

    this.logger.log(`Successfully deleted skill template ${id}`);
  }
}
