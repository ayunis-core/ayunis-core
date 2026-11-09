import type { ValidationArguments, ValidationOptions } from 'class-validator';
import { isUUID, registerDecorator } from 'class-validator';

/**
 * Requires the decorated property to be a UUID exactly when the DTO's
 * `ownerType` equals `ownerType`, and to be absent otherwise.
 */
export function IsIdForOwnerType(
  ownerType: string,
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return (target, propertyKey) => {
    const property = propertyKey.toString();
    registerDecorator({
      name: `is${property}ForOwnerType`,
      target: target.constructor,
      propertyName: property,
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments): boolean {
          const dto = args.object as { ownerType?: string };
          if (dto.ownerType === ownerType) {
            return typeof value === 'string' && isUUID(value);
          }
          return value === undefined;
        },
        defaultMessage(args: ValidationArguments): string {
          const dto = args.object as { ownerType?: string };
          return dto.ownerType === ownerType
            ? `${property} must be a UUID for ${ownerType} ownership`
            : `${property} must not be provided for ${String(dto.ownerType)} ownership`;
        },
      },
    });
  };
}
