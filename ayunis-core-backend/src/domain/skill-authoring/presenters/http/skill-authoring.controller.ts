import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ImproveSkillTextCommand } from 'src/domain/skill-authoring/application/use-cases/improve-skill-text/improve-skill-text.command';
import { ImproveSkillTextUseCase } from 'src/domain/skill-authoring/application/use-cases/improve-skill-text/improve-skill-text.use-case';
import { RequirePermission } from 'src/iam/authorization/application/decorators/permissions.decorator';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';
import {
  ImproveSkillTextDto,
  ImprovedSkillTextResponseDto,
} from './dto/improve-skill-text.dto';

@ApiTags('skills')
@Controller('skills')
export class SkillAuthoringController {
  private readonly logger = new Logger(SkillAuthoringController.name);

  constructor(private readonly improveSkillText: ImproveSkillTextUseCase) {}

  @RequirePermission(Permission.MANAGE_SKILLS)
  @Post('improve-text')
  @ApiOperation({
    summary: 'Rewrite a skill trigger or its instructions',
  })
  @ApiBody({ type: ImproveSkillTextDto })
  @ApiResponse({ status: 200, type: ImprovedSkillTextResponseDto })
  @HttpCode(HttpStatus.OK)
  async improveText(
    @Body() dto: ImproveSkillTextDto,
  ): Promise<ImprovedSkillTextResponseDto> {
    this.logger.log({ field: dto.field }, 'improveText');
    const text = await this.improveSkillText.execute(
      new ImproveSkillTextCommand({
        field: dto.field,
        name: dto.name,
        trigger: dto.trigger,
        instructions: dto.instructions,
      }),
    );
    return { text };
  }
}
