import {
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
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { UUID } from 'crypto';
import { RequireFeature } from 'src/common/guards/feature.guard';
import { FeatureFlag } from 'src/config/features.config';
import { CreateSkillCommand } from 'src/domain/skills/application/use-cases/create-skill/create-skill.command';
import { CreateSkillUseCase } from 'src/domain/skills/application/use-cases/create-skill/create-skill.use-case';
import { DeleteSkillCommand } from 'src/domain/skills/application/use-cases/delete-skill/delete-skill.command';
import { DeleteSkillUseCase } from 'src/domain/skills/application/use-cases/delete-skill/delete-skill.use-case';
import { FindOneSkillQuery } from 'src/domain/skills/application/use-cases/find-one-skill/find-one-skill.query';
import { FindOneSkillUseCase } from 'src/domain/skills/application/use-cases/find-one-skill/find-one-skill.use-case';
import { InstallSkillFromMarketplaceCommand } from 'src/domain/skills/application/use-cases/install-skill-from-marketplace/install-skill-from-marketplace.command';
import { InstallSkillFromMarketplaceUseCase } from 'src/domain/skills/application/use-cases/install-skill-from-marketplace/install-skill-from-marketplace.use-case';
import { ListAccessibleSkillsQuery } from 'src/domain/skills/application/use-cases/list-accessible-skills/list-accessible-skills.query';
import { ListAccessibleSkillsUseCase } from 'src/domain/skills/application/use-cases/list-accessible-skills/list-accessible-skills.use-case';
import { SetSkillActivationUseCase } from 'src/domain/skills/application/use-cases/set-skill-activation/set-skill-activation.use-case';
import { SetSkillPinUseCase } from 'src/domain/skills/application/use-cases/set-skill-pin/set-skill-pin.use-case';
import { UpdateSkillCommand } from 'src/domain/skills/application/use-cases/update-skill/update-skill.command';
import { UpdateSkillUseCase } from 'src/domain/skills/application/use-cases/update-skill/update-skill.use-case';
import { RequirePermission } from 'src/iam/authorization/application/decorators/permissions.decorator';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';
import { CreateSkillDto } from './dto/create-skill.dto';
import { InstallSkillFromMarketplaceDto } from './dto/install-skill-from-marketplace.dto';
import { ListSkillsQueryDto } from './dto/list-skills-query.dto';
import { toSkillOwner } from './dto/skill-owner.dto';
import {
  SkillListResponseDto,
  SkillResponseDto,
} from './dto/skill-response.dto';
import {
  SetSkillActivationDto,
  SetSkillPinDto,
} from './dto/set-skill-state.dto';
import { UpdateSkillDto } from './dto/update-skill.dto';
import { SkillDtoMapper } from './mappers/skill.mapper';

@ApiTags('skills')
@RequireFeature(FeatureFlag.Skills)
@Controller('skills')
export class SkillsController {
  private readonly logger = new Logger(SkillsController.name);

  constructor(
    private readonly installUseCase: InstallSkillFromMarketplaceUseCase,
    private readonly createSkill: CreateSkillUseCase,
    private readonly updateSkill: UpdateSkillUseCase,
    private readonly deleteSkill: DeleteSkillUseCase,
    private readonly findSkill: FindOneSkillUseCase,
    private readonly listSkills: ListAccessibleSkillsUseCase,
    private readonly setActivation: SetSkillActivationUseCase,
    private readonly setPin: SetSkillPinUseCase,
    private readonly mapper: SkillDtoMapper,
  ) {}

  @RequirePermission(Permission.MANAGE_SKILLS)
  @Post('install-from-marketplace')
  @ApiOperation({ summary: 'Install a skill from the marketplace' })
  @ApiBody({ type: InstallSkillFromMarketplaceDto })
  @ApiResponse({ status: 201, type: SkillResponseDto })
  async installFromMarketplace(
    @Body() dto: InstallSkillFromMarketplaceDto,
  ): Promise<SkillResponseDto> {
    const skill = await this.installUseCase.execute(
      new InstallSkillFromMarketplaceCommand(dto.identifier),
    );
    return this.mapper.toDto(skill, {
      isActive: true,
      isShared: false,
      isPinned: false,
    });
  }

  @RequirePermission(Permission.MANAGE_SKILLS)
  @Post()
  @ApiOperation({ summary: 'Create a new skill' })
  @ApiBody({ type: CreateSkillDto })
  @ApiResponse({ status: 201, type: SkillResponseDto })
  async create(@Body() dto: CreateSkillDto): Promise<SkillResponseDto> {
    this.logger.log({ name: dto.name, ownerType: dto.ownerType }, 'create');
    const skill = await this.createSkill.execute(
      new CreateSkillCommand({
        name: dto.name,
        shortDescription: dto.shortDescription,
        instructions: dto.instructions,
        isActive: dto.isActive,
        owner: toSkillOwner(dto),
      }),
    );
    return this.mapper.toDto(skill, {
      isActive: dto.isActive ?? true,
      isShared: false,
      isPinned: false,
    });
  }

  @Get()
  @ApiOperation({ summary: 'List skills for an owner scope' })
  @ApiResponse({ status: 200, type: SkillListResponseDto })
  async findAll(
    @Query() dto: ListSkillsQueryDto,
  ): Promise<SkillListResponseDto> {
    const page = await this.listSkills.execute(
      new ListAccessibleSkillsQuery({
        owner: toSkillOwner(dto),
        search: dto.search,
        limit: dto.limit,
        offset: dto.offset,
      }),
    );
    return {
      data: page.data.map(({ skill, creatorName, ...context }) =>
        this.mapper.toDto(skill, context, creatorName),
      ),
      pagination: { limit: page.limit, offset: page.offset, total: page.total },
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a skill by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: SkillResponseDto })
  async findOne(
    @Param('id', ParseUUIDPipe) id: UUID,
  ): Promise<SkillResponseDto> {
    const { skill, creatorName, ...context } = await this.findSkill.execute(
      new FindOneSkillQuery(id),
    );
    return this.mapper.toDto(skill, context, creatorName);
  }

  @RequirePermission(Permission.MANAGE_SKILLS)
  @Put(':id')
  @ApiOperation({ summary: 'Update a skill' })
  @ApiResponse({ status: 200, type: SkillResponseDto })
  async update(
    @Param('id', ParseUUIDPipe) id: UUID,
    @Body() dto: UpdateSkillDto,
  ): Promise<SkillResponseDto> {
    await this.updateSkill.execute(
      new UpdateSkillCommand({ skillId: id, ...dto }),
    );
    return this.findOne(id);
  }

  @RequirePermission(Permission.MANAGE_SKILLS)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id', ParseUUIDPipe) id: UUID): Promise<void> {
    await this.deleteSkill.execute(new DeleteSkillCommand(id));
  }

  @Patch(':id/activation')
  @ApiOperation({ summary: 'Set skill activation' })
  @ApiResponse({ status: 200, type: SkillResponseDto })
  async activate(
    @Param('id', ParseUUIDPipe) id: UUID,
    @Body() dto: SetSkillActivationDto,
  ): Promise<SkillResponseDto> {
    await this.setActivation.execute({ skillId: id, isActive: dto.isActive });
    return this.findOne(id);
  }

  @Patch(':id/pin')
  @ApiOperation({ summary: 'Set skill pinning' })
  @ApiResponse({ status: 200, type: SkillResponseDto })
  async pin(
    @Param('id', ParseUUIDPipe) id: UUID,
    @Body() dto: SetSkillPinDto,
  ): Promise<SkillResponseDto> {
    await this.setPin.execute({ skillId: id, isPinned: dto.isPinned });
    return this.findOne(id);
  }
}
