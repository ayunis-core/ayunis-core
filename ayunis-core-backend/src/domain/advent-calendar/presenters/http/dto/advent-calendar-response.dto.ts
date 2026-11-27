import { ApiExtraModels, ApiProperty } from '@nestjs/swagger';
import { AdventCalendarMediaType } from 'src/domain/advent-calendar/domain/advent-calendar-media';
import { AdventCalendarDoorState } from 'src/domain/advent-calendar/domain/advent-calendar-season';
import {
  ADVENT_CALENDAR_BUTTON_SCHEMA,
  AdventCalendarLinkButtonDto,
  AdventCalendarPromptButtonDto,
  AdventCalendarQuizButtonDto,
  type AdventCalendarButtonRequestDto,
} from './advent-calendar-button.dto';

export class AdventCalendarDoorMediaResponseDto {
  @ApiProperty({
    enum: AdventCalendarMediaType,
    enumName: 'AdventCalendarMediaType',
    description:
      'An image is served by the door image endpoint; a video is embedded as https://player.vimeo.com/video/<vimeoVideoId>?dnt=1[&h=<vimeoHash>]',
  })
  type: AdventCalendarMediaType;

  @ApiProperty({ type: String, nullable: true, example: '76979871' })
  vimeoVideoId: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'The privacy hash of an unlisted video',
  })
  vimeoHash: string | null;
}

@ApiExtraModels(
  AdventCalendarLinkButtonDto,
  AdventCalendarPromptButtonDto,
  AdventCalendarQuizButtonDto,
)
export class AdventCalendarDoorContentResponseDto {
  @ApiProperty()
  title: string;

  @ApiProperty({ description: 'Markdown' })
  body: string;

  @ApiProperty({ type: AdventCalendarDoorMediaResponseDto, nullable: true })
  media: AdventCalendarDoorMediaResponseDto | null;

  @ApiProperty(ADVENT_CALENDAR_BUTTON_SCHEMA)
  buttons: AdventCalendarButtonRequestDto[];

  @ApiProperty({
    type: String,
    format: 'date-time',
    description: 'Changes with every edit, e.g. to reload a replaced image',
  })
  updatedAt: string;
}

export class AdventCalendarDoorResponseDto {
  @ApiProperty({ minimum: 1, maximum: 24 })
  day: number;

  @ApiProperty({
    enum: AdventCalendarDoorState,
    enumName: 'AdventCalendarDoorState',
  })
  state: AdventCalendarDoorState;

  @ApiProperty({
    type: AdventCalendarDoorContentResponseDto,
    nullable: true,
    description: 'Set exactly when the door is openable',
  })
  content: AdventCalendarDoorContentResponseDto | null;
}

export class AdventCalendarResponseDto {
  @ApiProperty({
    description:
      'The calendar is switched on and today is between 1 December and 6 January (Europe/Berlin)',
  })
  visible: boolean;

  @ApiProperty({
    description:
      'The caller is a super admin: every door with content is openable, visible or not',
  })
  preview: boolean;

  @ApiProperty({
    type: String,
    format: 'date-time',
    description: "The server's time the door states were computed for",
  })
  now: string;

  @ApiProperty({
    type: [AdventCalendarDoorResponseDto],
    description:
      'All 24 doors by day, or none when the calendar is neither visible nor previewed',
  })
  doors: AdventCalendarDoorResponseDto[];
}

export class SuperAdminAdventCalendarDoorResponseDto {
  @ApiProperty({ minimum: 1, maximum: 24 })
  day: number;

  @ApiProperty({
    type: AdventCalendarDoorContentResponseDto,
    nullable: true,
    description: 'Null for an empty door',
  })
  content: AdventCalendarDoorContentResponseDto | null;
}

export class SuperAdminAdventCalendarResponseDto {
  @ApiProperty()
  enabled: boolean;

  @ApiProperty({
    type: [SuperAdminAdventCalendarDoorResponseDto],
    description: 'All 24 doors by day, with their full content',
  })
  doors: SuperAdminAdventCalendarDoorResponseDto[];
}
