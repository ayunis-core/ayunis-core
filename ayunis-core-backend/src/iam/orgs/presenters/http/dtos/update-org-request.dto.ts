import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class UpdateOrgRequestDto {
  @ApiProperty({
    description: 'Organization display name',
    example: 'Acme Corporation',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  name: string;
}
