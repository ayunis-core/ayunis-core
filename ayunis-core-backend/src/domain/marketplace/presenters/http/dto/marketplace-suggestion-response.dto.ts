import { ApiProperty } from '@nestjs/swagger';
import { MarketplaceRoutineScheduleResponseDto } from './marketplace-routine-response.dto';

export class MarketplaceSuggestionResponseDto {
  @ApiProperty({
    description: 'Unique identifier (slug), used to install the entry',
    example: 'email-beantworter',
  })
  identifier: string;

  @ApiProperty({ description: 'Display name' })
  name: string;

  @ApiProperty({ description: 'Short description for marketplace display' })
  shortDescription: string;

  @ApiProperty({
    description: 'Lucide icon name (kebab-case)',
    type: 'string',
    nullable: true,
  })
  iconName: string | null;
}

export class MarketplaceRoutineSuggestionResponseDto extends MarketplaceSuggestionResponseDto {
  @ApiProperty({ type: MarketplaceRoutineScheduleResponseDto })
  schedule: MarketplaceRoutineScheduleResponseDto;
}
