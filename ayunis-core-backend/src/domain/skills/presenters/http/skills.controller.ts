import {
  BadRequestException,
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Patch,
  Param,
  Body,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Logger,
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

// Use Cases
import { InstallSkillFromMarketplaceUseCase } from 'src/domain/skills/application/use-cases/install-skill-from-marketplace/install-skill-from-marketplace.use-case';
import { InstallSkillFromMarketplaceCommand } from 'src/domain/skills/application/use-cases/install-skill-from-marketplace/install-skill-from-marketplace.command';
import { CreateSkillUseCase } from 'src/domain/skills/application/use-cases/create-skill/create-skill.use-case';
import { UpdateSkillUseCase } from 'src/domain/skills/application/use-cases/update-skill/update-skill.use-case';
import { DeleteSkillUseCase } from 'src/domain/skills/application/use-cases/delete-skill/delete-skill.use-case';
import { FindOneSkillUseCase } from 'src/domain/skills/application/use-cases/find-one-skill/find-one-skill.use-case';
import { FindAllSkillsUseCase } from 'src/domain/skills/application/use-cases/find-all-skills/find-all-skills.use-case';
import { ToggleSkillActiveUseCase } from 'src/domain/skills/application/use-cases/toggle-skill-active/toggle-skill-active.use-case';
import { ToggleSkillPinnedUseCase } from 'src/domain/skills/application/use-cases/toggle-skill-pinned/toggle-skill-pinned.use-case';

// Commands & Queries
import { CreateSkillCommand } from 'src/domain/skills/application/use-cases/create-skill/create-skill.command';
import { UpdateSkillCommand } from 'src/domain/skills/application/use-cases/update-skill/update-skill.command';
import { DeleteSkillCommand } from 'src/domain/skills/application/use-cases/delete-skill/delete-skill.command';
import { FindOneSkillQuery } from 'src/domain/skills/application/use-cases/find-one-skill/find-one-skill.query';
import { FindAllSkillsQuery } from 'src/domain/skills/application/use-cases/find-all-skills/find-all-skills.query';
import { ToggleSkillActiveCommand } from 'src/domain/skills/application/use-cases/toggle-skill-active/toggle-skill-active.command';
import { ToggleSkillPinnedCommand } from 'src/domain/skills/application/use-cases/toggle-skill-pinned/toggle-skill-pinned.command';

// Services
import { SkillAccessService } from 'src/domain/skills/application/services/skill-access.service';
import { SkillCreatorNameService } from 'src/domain/skills/application/services/skill-creator-name.service';

// DTOs & Mappers
import { CreateSkillDto } from './dto/create-skill.dto';
import { UpdateSkillDto } from './dto/update-skill.dto';
import { InstallSkillFromMarketplaceDto } from './dto/install-skill-from-marketplace.dto';
import { SkillResponseDto } from './dto/skill-response.dto';
import { SkillDtoMapper } from './mappers/skill.mapper';
import { InvalidSkillNameError } from 'src/domain/skills/domain/skill.entity';
import { RequireFeature } from 'src/common/guards/feature.guard';
import { FeatureFlag } from 'src/config/features.config';
import { RequirePermission } from 'src/iam/authorization/application/decorators/permissions.decorator';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';

@ApiTags('skills')
@RequireFeature(FeatureFlag.Skills)
@Controller('skills')
export class SkillsController {
  private readonly logger = new Logger(SkillsController.name);

  constructor(
    private readonly installSkillFromMarketplaceUseCase: InstallSkillFromMarketplaceUseCase,
    private readonly createSkillUseCase: CreateSkillUseCase,
    private readonly updateSkillUseCase: UpdateSkillUseCase,
    private readonly deleteSkillUseCase: DeleteSkillUseCase,
    private readonly findOneSkillUseCase: FindOneSkillUseCase,
    private readonly findAllSkillsUseCase: FindAllSkillsUseCase,
    private readonly toggleSkillActiveUseCase: ToggleSkillActiveUseCase,
    private readonly toggleSkillPinnedUseCase: ToggleSkillPinnedUseCase,
    private readonly skillDtoMapper: SkillDtoMapper,
    private readonly skillAccessService: SkillAccessService,
    private readonly skillCreatorNameService: SkillCreatorNameService,
  ) {}

  @RequirePermission(Permission.MANAGE_SKILLS)
  @Post('install-from-marketplace')
  @ApiOperation({ summary: 'Install a skill from the marketplace' })
  @ApiBody({ type: InstallSkillFromMarketplaceDto })
  @ApiResponse({
    status: 201,
    description:
      'The skill has been successfully installed from the marketplace',
    type: SkillResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Marketplace skill not found',
  })
  async installFromMarketplace(
    @CurrentUser(UserProperty.ID) userId: UUID,
    @Body() dto: InstallSkillFromMarketplaceDto,
  ): Promise<SkillResponseDto> {
    this.logger.log(
      {
        userId,
        identifier: dto.identifier,
      },
      'installFromMarketplace',
    );

    const skill = await this.installSkillFromMarketplaceUseCase.execute(
      new InstallSkillFromMarketplaceCommand(dto.identifier),
    );

    return this.skillDtoMapper.toDto(skill, {
      isActive: true,
      isShared: false,
      isPinned: false,
    });
  }

  @RequirePermission(Permission.MANAGE_SKILLS)
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
    const isActive = dto.isActive ?? true;

    this.logger.log({ userId, name: dto.name }, 'create');

    try {
      const skill = await this.createSkillUseCase.execute(
        new CreateSkillCommand({
          name: dto.name,
          shortDescription: dto.shortDescription,
          instructions: dto.instructions,
          isActive,
        }),
      );

      return this.skillDtoMapper.toDto(skill, {
        isActive,
        isShared: false,
        isPinned: false,
      });
    } catch (error) {
      if (error instanceof InvalidSkillNameError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
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
    this.logger.log({ userId }, 'findAll');

    const {
      skills: results,
      activeSkillIds,
      pinnedSkillIds,
    } = await this.findAllSkillsUseCase.execute(new FindAllSkillsQuery());

    const skills = results.map((r) => r.skill);
    const sharedSkillIds = new Set<string>(
      results.filter((r) => r.isShared).map((r) => r.skill.id),
    );
    const sharedCreatorIds = results
      .filter((r) => r.isShared)
      .map((r) => r.skill.userId);
    const creatorNamesByUserId =
      await this.skillCreatorNameService.resolveMany(sharedCreatorIds);

    return this.skillDtoMapper.toDtoArray(
      skills,
      activeSkillIds,
      sharedSkillIds,
      pinnedSkillIds,
      creatorNamesByUserId,
    );
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
    this.logger.log({ id, userId }, 'findOne');

    const { skill, isActive, isShared, isPinned } =
      await this.findOneSkillUseCase.execute(new FindOneSkillQuery(id));

    const creatorName = isShared
      ? await this.skillCreatorNameService.resolveOne(skill.userId)
      : null;

    return this.skillDtoMapper.toDto(
      skill,
      { isActive, isShared, isPinned },
      creatorName,
    );
  }

  @RequirePermission(Permission.MANAGE_SKILLS)
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
    this.logger.log({ id, userId, name: dto.name }, 'update');

    try {
      const skill = await this.updateSkillUseCase.execute(
        new UpdateSkillCommand({
          skillId: id,
          name: dto.name,
          shortDescription: dto.shortDescription,
          instructions: dto.instructions,
        }),
      );

      const context = await this.skillAccessService.resolveUserContext(id);

      const creatorName = context.isShared
        ? await this.skillCreatorNameService.resolveOne(skill.userId)
        : null;

      return this.skillDtoMapper.toDto(skill, context, creatorName);
    } catch (error) {
      if (error instanceof InvalidSkillNameError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  @RequirePermission(Permission.MANAGE_SKILLS)
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
    this.logger.log({ id }, 'delete');

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
    this.logger.log({ id, userId }, 'toggleActive');

    const { skill, isActive, isShared, isPinned } =
      await this.toggleSkillActiveUseCase.execute(
        new ToggleSkillActiveCommand({ skillId: id }),
      );

    const creatorName = isShared
      ? await this.skillCreatorNameService.resolveOne(skill.userId)
      : null;

    return this.skillDtoMapper.toDto(
      skill,
      { isActive, isShared, isPinned },
      creatorName,
    );
  }

  @Patch(':id/toggle-pinned')
  @ApiOperation({ summary: 'Toggle skill pinned/unpinned status' })
  @ApiParam({
    name: 'id',
    description: 'The UUID of the skill to toggle pinned status',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'The skill pinned status has been toggled',
    type: SkillResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Skill not found' })
  @ApiResponse({ status: 400, description: 'Skill is not active' })
  async togglePinned(
    @CurrentUser(UserProperty.ID) userId: UUID,
    @Param('id', ParseUUIDPipe) id: UUID,
  ): Promise<SkillResponseDto> {
    this.logger.log({ id, userId }, 'togglePinned');

    const { skill, isPinned, isShared } =
      await this.toggleSkillPinnedUseCase.execute(
        new ToggleSkillPinnedCommand({ skillId: id }),
      );

    const creatorName = isShared
      ? await this.skillCreatorNameService.resolveOne(skill.userId)
      : null;

    return this.skillDtoMapper.toDto(
      skill,
      {
        isActive: true,
        isShared,
        isPinned,
      },
      creatorName,
    );
  }
}
