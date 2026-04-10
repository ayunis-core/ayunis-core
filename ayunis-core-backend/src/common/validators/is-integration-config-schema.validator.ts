import type { ValidationOptions, ValidationArguments } from 'class-validator';
import { registerDecorator } from 'class-validator';

const VALID_FIELD_TYPES = new Set(['text', 'url', 'secret']);

function isConfigField(value: unknown): boolean {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.key === 'string' &&
    typeof obj.label === 'string' &&
    typeof obj.type === 'string' &&
    VALID_FIELD_TYPES.has(obj.type) &&
    typeof obj.required === 'boolean'
  );
}

/**
 * Validates that a value conforms to the IntegrationConfigSchema shape:
 * - `authType` must be a non-empty string
 * - `orgFields` must be an array of valid ConfigField objects
 * - `userFields` must be an array of valid ConfigField objects
 */
export function IsIntegrationConfigSchema(
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isIntegrationConfigSchema',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (
            typeof value !== 'object' ||
            value === null ||
            Array.isArray(value)
          ) {
            return false;
          }
          const obj = value as Record<string, unknown>;

          if (typeof obj.authType !== 'string' || obj.authType.length === 0) {
            return false;
          }

          if (!Array.isArray(obj.orgFields)) {
            return false;
          }
          if (!obj.orgFields.every(isConfigField)) {
            return false;
          }

          if (!Array.isArray(obj.userFields)) {
            return false;
          }
          if (!obj.userFields.every(isConfigField)) {
            return false;
          }

          if (obj.oauth !== undefined) {
            if (
              typeof obj.oauth !== 'object' ||
              obj.oauth === null ||
              Array.isArray(obj.oauth)
            ) {
              return false;
            }
            const oauth = obj.oauth as Record<string, unknown>;
            if (
              typeof oauth.authorizationUrl !== 'string' ||
              oauth.authorizationUrl.length === 0
            ) {
              return false;
            }
            if (
              typeof oauth.tokenUrl !== 'string' ||
              oauth.tokenUrl.length === 0
            ) {
              return false;
            }
            if (
              !Array.isArray(oauth.scopes) ||
              !oauth.scopes.every((s: unknown) => typeof s === 'string')
            ) {
              return false;
            }
            if (oauth.level !== 'org' && oauth.level !== 'user') {
              return false;
            }
          }

          return true;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid IntegrationConfigSchema with authType (string), orgFields (ConfigField[]), userFields (ConfigField[]), and optionally oauth (OAuthConfig with authorizationUrl, tokenUrl, scopes, level)`;
        },
      },
    });
  };
}
