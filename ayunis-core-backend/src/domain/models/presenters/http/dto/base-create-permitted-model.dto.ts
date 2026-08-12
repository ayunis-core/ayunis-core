import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export abstract class BaseCreatePermittedModelDto {
  @ApiProperty({
    description: 'Whether this model should enforce anonymous mode',
    example: false,
    required: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  anonymousOnly?: boolean;

  @ApiProperty({
    description:
      'Whether built-in internet search and website content tools are enabled for this permitted model',
    example: true,
    required: false,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  internetAccessEnabled?: boolean;
}
