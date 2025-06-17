// src/common/validators/is-json-schema.validator.ts
import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';
import Ajv from 'ajv';

// Basic validation that a value is a JSON Schema object
export function IsJsonSchema(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isJsonSchema',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, _: ValidationArguments) {
          if (typeof value !== 'object' || value === null) {
            return false;
          }

          const ajv = new Ajv();
          return ajv.validateSchema(value) === true;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid JSON Schema object`;
        },
      },
    });
  };
}
