import {
  ApiExtraModels,
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import {
  ADVENT_CALENDAR_BODY_MAX_LENGTH,
  ADVENT_CALENDAR_MAX_BUTTONS,
  ADVENT_CALENDAR_TITLE_MAX_LENGTH,
} from 'src/domain/advent-calendar/domain/advent-calendar.constants';
import {
  ADVENT_CALENDAR_BUTTON_SCHEMA,
  AdventCalendarLinkButtonDto,
  AdventCalendarPromptButtonDto,
  AdventCalendarQuizButtonDto,
  toAdventCalendarButtonDtos,
  type AdventCalendarButtonRequestDto,
} from './advent-calendar-button.dto';
import { AtMostOneQuiz, IsVimeoUrl } from './advent-calendar-validators';

@ApiExtraModels(
  AdventCalendarLinkButtonDto,
  AdventCalendarPromptButtonDto,
  AdventCalendarQuizButtonDto,
)
export class SaveAdventCalendarDoorRequestDto {
  @ApiProperty({ maxLength: ADVENT_CALENDAR_TITLE_MAX_LENGTH })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(ADVENT_CALENDAR_TITLE_MAX_LENGTH)
  title: string;

  @ApiProperty({
    description: 'Markdown; may be empty',
    maxLength: ADVENT_CALENDAR_BODY_MAX_LENGTH,
  })
  @IsString()
  @MaxLength(ADVENT_CALENDAR_BODY_MAX_LENGTH)
  body: string;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description:
      'https://vimeo.com/<id>, https://vimeo.com/<id>/<hash> or https://player.vimeo.com/video/<id>[?h=<hash>]. Replaces the image; without it the door keeps its image, if any, and has no video.',
    example: 'https://vimeo.com/76979871',
  })
  @IsOptional()
  @IsString()
  @IsVimeoUrl()
  vimeoUrl?: string | null;

  @ApiProperty({
    ...ADVENT_CALENDAR_BUTTON_SCHEMA,
    description: 'Up to two buttons, at most one of them a quiz',
  })
  @IsArray()
  @ArrayMaxSize(ADVENT_CALENDAR_MAX_BUTTONS)
  @AtMostOneQuiz()
  @IsObject({ each: true })
  @ValidateNested({ each: true })
  @Transform(toAdventCalendarButtonDtos)
  buttons: AdventCalendarButtonRequestDto[];
}
