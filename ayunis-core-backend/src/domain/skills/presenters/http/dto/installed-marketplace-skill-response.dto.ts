import { ApiProperty } from '@nestjs/swagger';

export class InstalledMarketplaceSkillResponseDto {
  @ApiProperty({
    type: String,
    format: 'uuid',
    nullable: true,
    description:
      "ID of the current user's personal skill installed from this marketplace entry, or null when it is not installed.",
  })
  skillId: string | null;
}
