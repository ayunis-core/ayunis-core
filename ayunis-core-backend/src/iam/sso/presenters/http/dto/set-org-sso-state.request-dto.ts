import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class SetOrgSsoStateRequestDto {
  @ApiProperty()
  @IsBoolean()
  enabled: boolean;
}
