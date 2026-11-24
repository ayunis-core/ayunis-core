import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { ValidationArguments } from 'class-validator';
import { IsEnum, IsString, Matches, registerDecorator } from 'class-validator';
import {
  ROUTINE_LAST_MONTH_DAY,
  ROUTINE_MONTH_DAY_MAX,
  ROUTINE_WEEKDAY_MAX,
  ROUTINE_WEEKDAY_MIN,
  RoutineFrequency,
  describeRoutineScheduleProblem,
  routineSchedule,
  type RoutineMonthDay,
  type RoutineScheduleField,
  type RoutineScheduleInput,
  type RoutineScheduleProblem,
} from 'src/domain/routines/domain/routine-frequency';
import { ROUTINE_TIME_PATTERN } from 'src/domain/routines/domain/routines.constants';

const PROBLEM_REASONS: RoutineScheduleProblem['reason'][] = [
  'required',
  'not-allowed',
  'invalid',
];

/**
 * Applies the domain's schedule rules to one field, with the problem's reason
 * (`required`, `not-allowed`, `invalid`) as the constraint, so the client can
 * show it on that field.
 */
function MatchesRoutineSchedule(): PropertyDecorator {
  return (target, propertyKey) => {
    const field = propertyKey.toString() as RoutineScheduleField;
    for (const reason of PROBLEM_REASONS) {
      registerDecorator({
        name: reason,
        target: target.constructor,
        propertyName: field,
        validator: {
          validate(_value: unknown, args: ValidationArguments): boolean {
            const result = routineSchedule(args.object as RoutineScheduleInput);
            return (
              result.ok ||
              result.problem.field !== field ||
              result.problem.reason !== reason
            );
          },
          defaultMessage(): string {
            return describeRoutineScheduleProblem({ field, reason });
          },
        },
      });
    }
  };
}

/** Request and response shape of a routine's schedule. */
export class RoutineScheduleDto {
  @ApiProperty({
    enum: RoutineFrequency,
    enumName: 'RoutineFrequency',
    description:
      'Daily, weekly on `weekdays`, or monthly on `monthDay`. Fields of another frequency are rejected.',
  })
  @IsEnum(RoutineFrequency)
  frequency: RoutineFrequency;

  @ApiProperty({
    description: 'Run time as HH:mm (Europe/Berlin)',
    example: '07:30',
  })
  @IsString()
  @Matches(ROUTINE_TIME_PATTERN)
  time: string;

  @ApiPropertyOptional({
    type: 'integer',
    isArray: true,
    minimum: ROUTINE_WEEKDAY_MIN,
    maximum: ROUTINE_WEEKDAY_MAX,
    description:
      'Weekly only, and required there: ISO weekdays, 1 (Monday) to 7 (Sunday), at least one; stored ascending without duplicates',
    example: [1, 4],
  })
  @MatchesRoutineSchedule()
  weekdays?: number[];

  @ApiPropertyOptional({
    oneOf: [
      { type: 'integer', minimum: 1, maximum: ROUTINE_MONTH_DAY_MAX },
      { type: 'string', enum: [ROUTINE_LAST_MONTH_DAY] },
    ],
    description: `Monthly only, and required there: the day of the month, 1 to ${ROUTINE_MONTH_DAY_MAX}, or \`${ROUTINE_LAST_MONTH_DAY}\` for its last day`,
    example: 15,
  })
  @MatchesRoutineSchedule()
  monthDay?: RoutineMonthDay;
}
