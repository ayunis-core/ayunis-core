import {
  ApiProperty,
  ApiPropertyOptional,
  getSchemaPath,
} from '@nestjs/swagger';
import { plainToInstance, Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { AdventCalendarButtonKind } from 'src/domain/advent-calendar/domain/advent-calendar-button';
import {
  ADVENT_CALENDAR_BUTTON_LABEL_MAX_LENGTH,
  ADVENT_CALENDAR_LINK_URL_MAX_LENGTH,
  ADVENT_CALENDAR_MAX_BUTTONS,
  ADVENT_CALENDAR_PROMPT_MAX_LENGTH,
  ADVENT_CALENDAR_QUIZ_ANSWER_MAX_LENGTH,
  ADVENT_CALENDAR_QUIZ_EXPLANATION_MAX_LENGTH,
  ADVENT_CALENDAR_QUIZ_MAX_ANSWERS,
  ADVENT_CALENDAR_QUIZ_MIN_ANSWERS,
  ADVENT_CALENDAR_QUIZ_QUESTION_MAX_LENGTH,
} from 'src/domain/advent-calendar/domain/advent-calendar.constants';
import {
  IsAdventCalendarLinkUrl,
  IsAnswerIndex,
} from './advent-calendar-validators';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

const trimEach = ({ value }: { value: unknown }) =>
  Array.isArray(value) ? value.map((item) => trim({ value: item })) : value;

abstract class AdventCalendarButtonDto {
  @ApiProperty({ maxLength: ADVENT_CALENDAR_BUTTON_LABEL_MAX_LENGTH })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(ADVENT_CALENDAR_BUTTON_LABEL_MAX_LENGTH)
  label: string;
}

export class AdventCalendarLinkButtonDto extends AdventCalendarButtonDto {
  @ApiProperty({ enum: [AdventCalendarButtonKind.LINK] })
  @IsIn([AdventCalendarButtonKind.LINK])
  kind: AdventCalendarButtonKind.LINK;

  @ApiProperty({
    description:
      'An http(s) URL, opened in a new tab, or an in-app path starting with /, opened in the same tab',
    maxLength: ADVENT_CALENDAR_LINK_URL_MAX_LENGTH,
    example: '/marketplace',
  })
  @IsString()
  @MaxLength(ADVENT_CALENDAR_LINK_URL_MAX_LENGTH)
  @IsAdventCalendarLinkUrl()
  url: string;
}

export class AdventCalendarPromptButtonDto extends AdventCalendarButtonDto {
  @ApiProperty({ enum: [AdventCalendarButtonKind.PROMPT] })
  @IsIn([AdventCalendarButtonKind.PROMPT])
  kind: AdventCalendarButtonKind.PROMPT;

  @ApiProperty({
    description: 'Filled into the input of a new chat, not sent',
    maxLength: ADVENT_CALENDAR_PROMPT_MAX_LENGTH,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(ADVENT_CALENDAR_PROMPT_MAX_LENGTH)
  prompt: string;
}

export class AdventCalendarQuizButtonDto extends AdventCalendarButtonDto {
  @ApiProperty({ enum: [AdventCalendarButtonKind.QUIZ] })
  @IsIn([AdventCalendarButtonKind.QUIZ])
  kind: AdventCalendarButtonKind.QUIZ;

  @ApiProperty({ maxLength: ADVENT_CALENDAR_QUIZ_QUESTION_MAX_LENGTH })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(ADVENT_CALENDAR_QUIZ_QUESTION_MAX_LENGTH)
  question: string;

  @ApiProperty({
    type: [String],
    minItems: ADVENT_CALENDAR_QUIZ_MIN_ANSWERS,
    maxItems: ADVENT_CALENDAR_QUIZ_MAX_ANSWERS,
  })
  @Transform(trimEach)
  @IsArray()
  @ArrayMinSize(ADVENT_CALENDAR_QUIZ_MIN_ANSWERS)
  @ArrayMaxSize(ADVENT_CALENDAR_QUIZ_MAX_ANSWERS)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(ADVENT_CALENDAR_QUIZ_ANSWER_MAX_LENGTH, { each: true })
  answers: string[];

  @ApiProperty({
    description: 'The index of the one correct answer',
    minimum: 0,
  })
  @IsInt()
  @IsAnswerIndex()
  correctAnswerIndex: number;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: 'Shown after an answer is picked',
    maxLength: ADVENT_CALENDAR_QUIZ_EXPLANATION_MAX_LENGTH,
  })
  @IsOptional()
  @IsString()
  @MaxLength(ADVENT_CALENDAR_QUIZ_EXPLANATION_MAX_LENGTH)
  explanation?: string | null;
}

/**
 * What a button of any other kind is validated as. The validation pipe lets a
 * plain object without rules through, so without it the button would be
 * stripped to `{}` instead of rejected.
 */
export class UnsupportedAdventCalendarButtonDto {
  @IsIn(Object.values(AdventCalendarButtonKind))
  kind: unknown;
}

export type AdventCalendarButtonRequestDto =
  | AdventCalendarLinkButtonDto
  | AdventCalendarPromptButtonDto
  | AdventCalendarQuizButtonDto;

export const ADVENT_CALENDAR_BUTTON_SCHEMA = {
  type: 'array' as const,
  maxItems: ADVENT_CALENDAR_MAX_BUTTONS,
  items: {
    oneOf: [
      { $ref: getSchemaPath(AdventCalendarLinkButtonDto) },
      { $ref: getSchemaPath(AdventCalendarPromptButtonDto) },
      { $ref: getSchemaPath(AdventCalendarQuizButtonDto) },
    ],
    discriminator: { propertyName: 'kind' },
  },
};

const BUTTON_DTOS = new Map<unknown, new () => object>([
  [AdventCalendarButtonKind.LINK, AdventCalendarLinkButtonDto],
  [AdventCalendarButtonKind.PROMPT, AdventCalendarPromptButtonDto],
  [AdventCalendarButtonKind.QUIZ, AdventCalendarQuizButtonDto],
]);

/**
 * Turns each button into the DTO of its kind. class-transformer's own
 * discriminator throws on a `null` element, which would answer a bad request
 * with a 500; anything that is not an object is left for `@IsObject` here.
 */
export function toAdventCalendarButtonDtos({
  value,
}: {
  value: unknown;
}): unknown {
  if (!Array.isArray(value)) return value;
  return value.map((button: unknown) => {
    if (
      typeof button !== 'object' ||
      button === null ||
      Array.isArray(button)
    ) {
      return button;
    }
    const dto =
      BUTTON_DTOS.get((button as { kind?: unknown }).kind) ??
      UnsupportedAdventCalendarButtonDto;
    return plainToInstance(dto, button);
  });
}
