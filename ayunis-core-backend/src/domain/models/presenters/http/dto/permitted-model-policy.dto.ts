import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

/**
 * The switches of a model grant. Omitted ones start off on create and keep
 * their stored value on update.
 */
export class PermittedModelPolicyDto {
  @ApiProperty({
    description: 'Whether this model should enforce anonymous mode',
    example: false,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  anonymousOnly?: boolean;

  @ApiProperty({
    description:
      "Whether runs on this model may use the user's memory. Only applies while the memory feature is enabled.",
    example: false,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  memoryAccess?: boolean;
}
