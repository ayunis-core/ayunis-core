import type { ValidationArguments, ValidationOptions } from 'class-validator';
import { isUUID, registerDecorator } from 'class-validator';

export function IsOwnerReference(
  ownerType: string,
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return (target, propertyKey) => {
    registerDecorator({
      name: `is${ownerType}OwnerReference`,
      target: target.constructor,
      propertyName: propertyKey.toString(),
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments): boolean {
          const { ownerType: requested } = args.object as {
            ownerType?: unknown;
          };
          if (requested === ownerType) {
            return typeof value === 'string' && isUUID(value);
          }
          return value === undefined;
        },
        defaultMessage(args: ValidationArguments): string {
          return `${args.property} must be a UUID for ${ownerType} ownership and omitted otherwise`;
        },
      },
    });
  };
}
