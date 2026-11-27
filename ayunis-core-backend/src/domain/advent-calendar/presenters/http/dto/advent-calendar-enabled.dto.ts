import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class AdventCalendarEnabledDto {
  @ApiProperty({
    description:
      'Users see the calendar while this is on and today is between 1 December and 6 January',
  })
  @IsBoolean()
  enabled: boolean;
}
