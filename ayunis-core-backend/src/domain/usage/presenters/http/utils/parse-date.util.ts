import { BadRequestException } from '@nestjs/common';

/**
 * Parses a date string from a query parameter, throwing a BadRequestException
 * if the string is not a valid date.
 */
export function parseDate(value: string, paramName: string): Date {
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    throw new BadRequestException(
      `Invalid date string for '${paramName}': ${value}`,
    );
  }
  return date;
}
