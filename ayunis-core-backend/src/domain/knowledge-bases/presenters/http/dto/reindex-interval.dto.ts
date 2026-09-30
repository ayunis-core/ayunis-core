import { ApiProperty } from '@nestjs/swagger';
import type { ValidationArguments, ValidationOptions } from 'class-validator';
import { IsEnum, IsInt, Min, registerDecorator } from 'class-validator';
import {
  REINDEX_INTERVAL_MAX_VALUE,
  ReindexInterval,
  ReindexIntervalUnit,
} from 'src/domain/sources/domain/reindex-interval';

function IsWithinMaximumForUnit(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return (target, propertyKey) => {
    registerDecorator({
      name: 'maxForUnit',
      target: target.constructor,
      propertyName: propertyKey.toString(),
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments): boolean {
          const { unit } = args.object as ReindexIntervalDto;
          // An unknown unit is reported on the unit field alone.
          if (!Object.values(ReindexIntervalUnit).includes(unit)) return true;
          return (
            typeof value === 'number' &&
            value <= REINDEX_INTERVAL_MAX_VALUE[unit]
          );
        },
        defaultMessage(args: ValidationArguments): string {
          const { unit } = args.object as ReindexIntervalDto;
          return `value must not exceed ${REINDEX_INTERVAL_MAX_VALUE[unit]} ${unit}`;
        },
      },
    });
  };
}

export class ReindexIntervalDto {
  @ApiProperty({
    description:
      'Number of units between automatic re-index runs (1-52 weeks or 1-12 months)',
    minimum: 1,
    maximum: 52,
    example: 2,
  })
  @IsInt()
  @Min(1)
  @IsWithinMaximumForUnit()
  value: number;

  @ApiProperty({
    description: 'Unit of the interval',
    enum: ReindexIntervalUnit,
    enumName: 'ReindexIntervalUnit',
    example: ReindexIntervalUnit.WEEKS,
  })
  @IsEnum(ReindexIntervalUnit)
  unit: ReindexIntervalUnit;
}

export function toReindexInterval(
  dto: ReindexIntervalDto | null | undefined,
): ReindexInterval | null {
  return dto ? new ReindexInterval(dto.value, dto.unit) : null;
}
