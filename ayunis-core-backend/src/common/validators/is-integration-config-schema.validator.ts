import type { ValidationOptions, ValidationArguments } from 'class-validator';
import { registerDecorator } from 'class-validator';

const VALID_FIELD_TYPES = new Set(['text', 'url', 'secret']);

const isConfigField = (value: unknown): boolean => {
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
};

const isNonEmptyString = (v: unknown): boolean =>
  typeof v === 'string' && v.length > 0;

const isStringArray = (v: unknown): boolean =>
  Array.isArray(v) && v.every((s: unknown) => typeof s === 'string');

const isValidOAuthConfig = (value: unknown): boolean => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const oauth = value as Record<string, unknown>;
  if (!isNonEmptyString(oauth.authorizationUrl)) return false;
  if (!isNonEmptyString(oauth.tokenUrl)) return false;
  if (!isStringArray(oauth.scopes)) return false;
  return oauth.level === 'org' || oauth.level === 'user';
};

const isValidFieldArray = (value: unknown): boolean =>
  Array.isArray(value) && value.every(isConfigField);

const isValidConfigSchema = (value: unknown): boolean => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const obj = value as Record<string, unknown>;
  if (typeof obj.authType !== 'string' || obj.authType.length === 0) {
    return false;
  }
  if (!isValidFieldArray(obj.orgFields) || !isValidFieldArray(obj.userFields)) {
    return false;
  }
  if (obj.oauth !== undefined && !isValidOAuthConfig(obj.oauth)) {
    return false;
  }
  return true;
};

/**
 * Validates that a value conforms to the IntegrationConfigSchema shape:
 * - `authType` must be a non-empty string
 * - `orgFields` must be an array of valid ConfigField objects
 * - `userFields` must be an array of valid ConfigField objects
 * - `oauth` (optional) must conform to OAuthConfig
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
        validate: isValidConfigSchema,
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid IntegrationConfigSchema with authType (string), orgFields (ConfigField[]), userFields (ConfigField[]), and optional oauth (OAuthConfig)`;
        },
      },
    });
  };
}
