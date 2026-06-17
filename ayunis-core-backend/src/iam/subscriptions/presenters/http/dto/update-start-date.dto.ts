import { ApiProperty } from '@nestjs/swagger';
import { IsDateString } from 'class-validator';

export class UpdateStartDateDto {
  @ApiProperty({
    description: 'New subscription start date (ISO 8601)',
    example: '2026-08-15T00:00:00.000Z',
  })
  @IsDateString()
  startsAt: string;
}
