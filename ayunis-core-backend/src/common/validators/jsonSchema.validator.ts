// src/common/validators/is-json-schema.validator.ts
import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';
import { createAjv } from './ajv.factory';

// Basic validation that a value is a JSON Schema object
export function IsJsonSchema(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isJsonSchema',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (typeof value !== 'object' || value === null) {
            return false;
          }

          const ajv = createAjv();
          return ajv.validateSchema(value) === true;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid JSON Schema object`;
        },
      },
    });
  };
}
