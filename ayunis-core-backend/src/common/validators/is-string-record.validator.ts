import type { ValidationOptions, ValidationArguments } from 'class-validator';
import { registerDecorator } from 'class-validator';

/**
 * Validates that a value is a plain object where every value is a string.
 * Use on `Record<string, string>` DTO fields to enforce type safety at runtime,
 * since TypeScript's `Record<string, string>` is erased after compilation.
 */
export function IsStringRecord(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isStringRecord',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (typeof value !== 'object' || value === null) {
            return false;
          }
          return Object.values(value).every((v) => typeof v === 'string');
        },
        defaultMessage(args: ValidationArguments) {
          return `all values in ${args.property} must be strings`;
        },
      },
    });
  };
}
