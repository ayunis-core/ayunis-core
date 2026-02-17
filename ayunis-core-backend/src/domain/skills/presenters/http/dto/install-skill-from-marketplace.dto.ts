import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class InstallSkillFromMarketplaceDto {
  @ApiProperty({
    description: 'The unique identifier (slug) of the marketplace skill',
    example: 'meeting-summarizer',
  })
  @IsString()
  @IsNotEmpty()
  identifier: string;
}
