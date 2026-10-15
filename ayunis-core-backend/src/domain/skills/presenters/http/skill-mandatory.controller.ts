import { Body, Controller, Param, ParseUUIDPipe, Patch } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UUID } from 'crypto';
import { FindOneSkillQuery } from 'src/domain/skills/application/use-cases/find-one-skill/find-one-skill.query';
import { FindOneSkillUseCase } from 'src/domain/skills/application/use-cases/find-one-skill/find-one-skill.use-case';
import { SetSkillMandatoryCommand } from 'src/domain/skills/application/use-cases/set-skill-mandatory/set-skill-mandatory.command';
import { SetSkillMandatoryUseCase } from 'src/domain/skills/application/use-cases/set-skill-mandatory/set-skill-mandatory.use-case';
import { SetSkillMandatoryDto } from './dto/set-skill-state.dto';
import { SkillResponseDto } from './dto/skill-response.dto';
import { SkillDtoMapper } from './mappers/skill.mapper';

@ApiTags('skills')
@Controller('skills')
export class SkillMandatoryController {
  constructor(
    private readonly setMandatory: SetSkillMandatoryUseCase,
    private readonly findSkill: FindOneSkillUseCase,
    private readonly mapper: SkillDtoMapper,
  ) {}

  @Patch(':id/mandatory')
  @ApiOperation({
    summary: 'Make an organisation skill mandatory for everyone, or not',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: SkillResponseDto })
  @ApiResponse({
    status: 400,
    description: 'The skill is not owned by the organisation',
  })
  async mandatory(
    @Param('id', ParseUUIDPipe) id: UUID,
    @Body() dto: SetSkillMandatoryDto,
  ): Promise<SkillResponseDto> {
    await this.setMandatory.execute(
      new SetSkillMandatoryCommand(id, dto.isMandatory),
    );
    const { skill, ...context } = await this.findSkill.execute(
      new FindOneSkillQuery(id),
    );
    return this.mapper.toDto(skill, context);
  }
}
