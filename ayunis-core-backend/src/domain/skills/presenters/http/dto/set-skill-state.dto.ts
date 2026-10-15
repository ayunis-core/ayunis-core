import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class SetSkillActivationDto {
  @ApiProperty()
  @IsBoolean()
  isActive: boolean;
}

export class SetSkillMandatoryDto {
  @ApiProperty()
  @IsBoolean()
  isMandatory: boolean;
}

export class SetSkillPinDto {
  @ApiProperty()
  @IsBoolean()
  isPinned: boolean;
}
