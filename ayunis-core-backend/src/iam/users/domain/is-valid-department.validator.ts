import type { ValidationOptions, ValidationArguments } from 'class-validator';
import { registerDecorator } from 'class-validator';
import { isValidDepartment } from './department.constants';

/**
 * Validates that a string is a known department key or matches the `other:<text>` pattern.
 * Delegates to {@link isValidDepartment}.
 */
export function IsValidDepartment(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isValidDepartment',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (typeof value !== 'string') {
            return false;
          }
          return isValidDepartment(value);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid department key or match the pattern "other:<text>"`;
        },
      },
    });
  };
}
