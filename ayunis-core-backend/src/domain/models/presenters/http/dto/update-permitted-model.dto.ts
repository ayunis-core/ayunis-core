import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdatePermittedModelDto {
  @ApiProperty({
    description: 'Whether this model should enforce anonymous mode',
    example: true,
  })
  @IsBoolean()
  anonymousOnly: boolean;
}
