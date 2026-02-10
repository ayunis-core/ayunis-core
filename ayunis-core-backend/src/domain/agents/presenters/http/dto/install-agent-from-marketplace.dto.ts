import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class InstallAgentFromMarketplaceDto {
  @ApiProperty({
    description: 'The unique identifier (slug) of the marketplace agent',
    example: 'meeting-summarizer',
  })
  @IsString()
  @IsNotEmpty()
  identifier: string;
}
