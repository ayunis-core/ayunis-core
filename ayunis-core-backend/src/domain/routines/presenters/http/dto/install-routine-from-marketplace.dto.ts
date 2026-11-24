import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ROUTINE_MARKETPLACE_IDENTIFIER_MAX_LENGTH } from 'src/domain/routines/domain/routines.constants';

export class InstallRoutineFromMarketplaceDto {
  @ApiProperty({
    description: 'The unique identifier (slug) of the marketplace routine',
    example: 'amtsblatt-nrw',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(ROUTINE_MARKETPLACE_IDENTIFIER_MAX_LENGTH)
  identifier: string;
}
