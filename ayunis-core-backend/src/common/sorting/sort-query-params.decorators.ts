import { applyDecorators } from '@nestjs/common';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { SortOrder } from 'src/common/sorting/sort';

export function SortByQueryParam<Field extends string>(
  fields: Record<string, Field>,
  enumName: string,
  defaultField: Field,
): PropertyDecorator {
  return applyDecorators(
    ApiPropertyOptional({
      enum: fields,
      enumName,
      default: defaultField,
      description: 'Column to sort by',
    }),
    IsOptional(),
    IsEnum(fields),
  );
}

export function SortOrderQueryParam(
  defaultOrder: SortOrder = SortOrder.DESC,
): PropertyDecorator {
  return applyDecorators(
    ApiPropertyOptional({
      enum: SortOrder,
      enumName: 'SortOrder',
      default: defaultOrder,
      description: 'Sort direction',
    }),
    IsOptional(),
    IsEnum(SortOrder),
  );
}
