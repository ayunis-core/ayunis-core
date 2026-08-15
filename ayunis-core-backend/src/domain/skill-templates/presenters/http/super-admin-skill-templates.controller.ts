import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
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
  constructor(
    @InjectPinoLogger(SuperAdminSkillTemplatesController.name)
    private readonly logger: PinoLogger,
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
    this.logger.info({ name: dto.name }, 'Creating skill template');

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

      this.logger.info(
        { skillTemplateId: template.id },
        'Successfully created skill template',
      );
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
    this.logger.info('Finding all skill templates');

    const templates = await this.findAllSkillTemplatesUseCase.execute(
      new FindAllSkillTemplatesQuery(),
    );

    this.logger.info(
      { count: templates.length },
      'Successfully retrieved skill templates',
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
    this.logger.info({ skillTemplateId: id }, 'Finding skill template');

    const template = await this.findOneSkillTemplateUseCase.execute(
      new FindOneSkillTemplateQuery(id),
    );

    this.logger.info(
      { skillTemplateId: id },
      'Successfully retrieved skill template',
    );
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
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  async update(
    @Param('id', ParseUUIDPipe) id: UUID,
    @Body() dto: UpdateSkillTemplateDto,
  ): Promise<SkillTemplateResponseDto> {
    this.logger.info({ skillTemplateId: id }, 'Updating skill template');
    try {
      const command = this.createUpdateCommand(id, dto);
      const template = await this.updateSkillTemplateUseCase.execute(command);

      this.logger.info(
        { skillTemplateId: id },
        'Successfully updated skill template',
      );
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
    this.logger.info({ skillTemplateId: id }, 'Deleting skill template');

    await this.deleteSkillTemplateUseCase.execute(
      new DeleteSkillTemplateCommand({ skillTemplateId: id }),
    );

    this.logger.info(
      { skillTemplateId: id },
      'Successfully deleted skill template',
    );
  }

  private createUpdateCommand(
    id: UUID,
    dto: UpdateSkillTemplateDto,
  ): UpdateSkillTemplateCommand {
    return new UpdateSkillTemplateCommand({
      skillTemplateId: id,
      name: dto.name,
      shortDescription: dto.shortDescription,
      instructions: dto.instructions,
      distributionMode: dto.distributionMode,
      isActive: dto.isActive,
      defaultActive: dto.defaultActive,
      defaultPinned: dto.defaultPinned,
    });
  }
}
