import { BadRequestException } from '@nestjs/common';
import { parseDate } from './parse-date.util';

describe('parseDate', () => {
  it('should parse a valid date string', () => {
    const result = parseDate('2024-01-15', 'startDate');
    expect(result).toBeInstanceOf(Date);
    expect(result.getFullYear()).toBe(2024);
    expect(result.getMonth()).toBe(0); // January
    expect(result.getDate()).toBe(15);
  });

  it('should throw BadRequestException for an invalid string', () => {
    expect(() => parseDate('garbage', 'startDate')).toThrow(
      BadRequestException,
    );
  });

  it('should throw BadRequestException for an empty string', () => {
    expect(() => parseDate('', 'startDate')).toThrow(BadRequestException);
  });
});
