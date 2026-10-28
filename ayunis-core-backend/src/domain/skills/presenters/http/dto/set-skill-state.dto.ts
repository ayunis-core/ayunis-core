import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class SetSkillActivationDto {
  @ApiProperty()
  @IsBoolean()
  isActive: boolean;
}

export class SetSkillPinDto {
  @ApiProperty()
  @IsBoolean()
  isPinned: boolean;
}
