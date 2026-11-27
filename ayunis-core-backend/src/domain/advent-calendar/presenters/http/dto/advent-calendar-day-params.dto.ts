import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';
import { ADVENT_CALENDAR_DOOR_COUNT } from 'src/domain/advent-calendar/domain/advent-calendar.constants';

export class AdventCalendarDayParamsDto {
  @ApiProperty({
    type: Number,
    minimum: 1,
    maximum: ADVENT_CALENDAR_DOOR_COUNT,
    description: 'The day of December the door opens on',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(ADVENT_CALENDAR_DOOR_COUNT)
  day: number;
}
