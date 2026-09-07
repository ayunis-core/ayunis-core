import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateWorkspaceSkillActivationDto {
  @ApiProperty()
  @IsBoolean()
  isActive: boolean;
}

export class UpdateWorkspaceKnowledgeBaseActivationDto {
  @ApiProperty()
  @IsBoolean()
  isActive: boolean;
}

export class UpdateWorkspaceSkillPinDto {
  @ApiProperty()
  @IsBoolean()
  isPinned: boolean;
}
