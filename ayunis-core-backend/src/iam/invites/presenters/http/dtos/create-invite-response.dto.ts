import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsUrl } from 'class-validator';

export class CreateInviteResponseDto {
  @ApiProperty({
    description:
      'URL of the invite, returned when not using email configuration',
    example: 'https://example.com/invite/123e4567-e89b-12d3-a456-426614174000',
    type: 'string',
    nullable: true,
  })
  @IsUrl()
  @IsOptional()
  url: string | null;
}
