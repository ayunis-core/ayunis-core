import { ApiProperty } from '@nestjs/swagger';

export class OparlCatalogBodyResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ type: String, nullable: true })
  name: string | null;

  @ApiProperty({ type: String, nullable: true })
  shortName: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Web page in the RIS',
  })
  web: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Name of the OParl system',
  })
  systemName: string | null;

  @ApiProperty({ description: 'Whether the organization linked the body' })
  linked: boolean;

  @ApiProperty({ type: Date, nullable: true })
  linkedAt: Date | null;
}
