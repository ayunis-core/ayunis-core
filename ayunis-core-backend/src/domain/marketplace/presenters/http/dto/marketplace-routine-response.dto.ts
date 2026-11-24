import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  RoutineFrequency,
  RoutineInternetAccess,
} from 'src/common/clients/marketplace/generated/ayunisMarketplaceAPI.schemas';

export class MarketplaceRoutineScheduleResponseDto {
  @ApiProperty({
    enum: RoutineFrequency,
    enumName: 'RoutineFrequency',
    // The enum schema is shared with the routines API, and the last
    // description registered for it wins.
    description:
      'Daily, weekly on `weekdays`, or monthly on `monthDay`. Fields of another frequency are rejected.',
  })
  frequency: RoutineFrequency;

  @ApiProperty({
    description: 'Run time as HH:mm (Europe/Berlin)',
    example: '07:30',
  })
  time: string;

  @ApiPropertyOptional({
    type: 'integer',
    isArray: true,
    description:
      'Weekly only: ISO weekdays, 1 (Monday) to 7 (Sunday). Absent for the other frequencies.',
    example: [1, 4],
  })
  weekdays?: number[];

  @ApiPropertyOptional({
    oneOf: [{ type: 'integer' }, { type: 'string', enum: ['last'] }],
    description:
      'Monthly only: the day of the month, or `last` for its last day. Absent for the other frequencies.',
    example: 15,
  })
  monthDay?: number | 'last';
}

export class MarketplaceRoutineResponseDto {
  @ApiProperty({ description: 'Routine UUID in the marketplace' })
  id: string;

  @ApiProperty({
    description: 'Unique identifier (slug)',
    example: 'amtsblatt-nrw',
  })
  identifier: string;

  @ApiProperty({ description: 'Display name, also the installed name' })
  name: string;

  @ApiProperty({ description: 'Short description for marketplace display' })
  shortDescription: string;

  @ApiProperty({
    description: 'Longer description',
    type: 'string',
    nullable: true,
  })
  description: string | null;

  @ApiProperty({
    description: 'Lucide icon name (kebab-case)',
    type: 'string',
    nullable: true,
  })
  iconName: string | null;

  @ApiProperty({ type: MarketplaceRoutineScheduleResponseDto })
  schedule: MarketplaceRoutineScheduleResponseDto;

  @ApiProperty({
    enum: RoutineInternetAccess,
    enumName: 'RoutineInternetAccess',
  })
  internetAccess: RoutineInternetAccess;

  @ApiProperty({
    type: [String],
    description:
      'Hosts the routine may access, with their subdomains; applied only in `allowlist` mode',
    example: ['recht.nrw.de'],
  })
  allowedDomains: string[];
}
