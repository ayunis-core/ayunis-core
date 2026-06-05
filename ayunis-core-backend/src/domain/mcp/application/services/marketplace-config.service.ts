import { Injectable } from '@nestjs/common';
import { McpCredentialEncryptionPort } from '../ports/mcp-credential-encryption.port';
import {
  ConfigField,
  fieldRequiresInput,
  isConfigValuePresent,
  isSystemFixedField,
} from '../../domain/value-objects/integration-config-schema';
import { McpMissingRequiredConfigError } from '../mcp.errors';

/**
 * Shared service for marketplace integration config processing.
 * Handles merging fixed values, validating required fields, encrypting secrets,
 * and merging values during updates (with secret retention).
 */
@Injectable()
export class MarketplaceConfigService {
  constructor(
    private readonly credentialEncryption: McpCredentialEncryptionPort,
  ) {}

  /**
   * Merges fixed (system-controlled) values from the config schema into user-provided values.
   * Fixed values always take precedence over user-provided ones.
   */
  mergeFixedValues(
    userProvided: Record<string, string>,
    orgFields: ConfigField[],
  ): Record<string, string> {
    const merged = { ...userProvided };
    for (const field of orgFields) {
      if (isSystemFixedField(field)) {
        merged[field.key] = field.value as string;
      }
    }
    return merged;
  }

  /**
   * Validates that every field requiring actor input has a present (non-empty,
   * non-whitespace) value. System-fixed fields are satisfied by the schema and
   * are never required from the actor. Throws McpMissingRequiredConfigError if
   * any required input is missing.
   */
  validateRequiredFields(
    fields: ConfigField[],
    values: Record<string, string>,
  ): void {
    const missing = fields
      .filter(
        (field) =>
          fieldRequiresInput(field) && !isConfigValuePresent(values[field.key]),
      )
      .map((field) => field.key);

    if (missing.length > 0) {
      throw new McpMissingRequiredConfigError(missing);
    }
  }

  /**
   * Encrypts values for fields marked as type 'secret'.
   * Non-secret field values are passed through unchanged.
   */
  async encryptSecretFields(
    orgFields: ConfigField[],
    values: Record<string, string>,
  ): Promise<Record<string, string>> {
    const encrypted = { ...values };
    const secretKeys = new Set(
      orgFields.filter((f) => f.type === 'secret').map((f) => f.key),
    );

    for (const key of Object.keys(encrypted)) {
      if (secretKeys.has(key)) {
        encrypted[key] = await this.credentialEncryption.encrypt(
          encrypted[key],
        );
      }
    }
    return encrypted;
  }

  /**
   * Merges config values for an update operation with secret retention.
   *
   * For each org field:
   * - Fixed-value fields: always use the value from the schema
   * - Secret fields: if the provided value is missing or empty, keep the existing encrypted value;
   *   otherwise encrypt the new value
   * - Non-secret fields: use the provided value if present, otherwise keep existing
   *
   * After merging, validates required fields and returns the final merged+encrypted values.
   */
  async mergeForUpdate(
    existingValues: Record<string, string>,
    providedValues: Record<string, string>,
    orgFields: ConfigField[],
  ): Promise<Record<string, string>> {
    const merged = this.mergePlaintextValues(
      existingValues,
      providedValues,
      orgFields,
    );

    this.validateRequiredFields(orgFields, merged);

    await this.encryptNewAndFixedSecrets(merged, providedValues, orgFields);

    return merged;
  }

  /**
   * Merges existing and provided values into a single map, keeping plaintext
   * for new secrets so validation can check them before encryption.
   */
  private mergePlaintextValues(
    existingValues: Record<string, string>,
    providedValues: Record<string, string>,
    orgFields: ConfigField[],
  ): Record<string, string> {
    const merged: Record<string, string> = {};

    for (const field of orgFields) {
      if (isSystemFixedField(field)) {
        merged[field.key] = field.value as string;
        continue;
      }

      const provided = providedValues[field.key];
      const hasProvided = field.key in providedValues;
      const hasExisting = field.key in existingValues;

      if (field.type === 'secret') {
        // Ignore empty secret input so the existing encrypted value is kept.
        if (provided) {
          merged[field.key] = provided;
        } else if (hasExisting) {
          merged[field.key] = existingValues[field.key];
        }
      } else if (hasProvided) {
        merged[field.key] = provided;
      } else if (hasExisting) {
        merged[field.key] = existingValues[field.key];
      }
    }

    return merged;
  }

  /**
   * Encrypts newly provided secret values and fixed-value secret fields in place.
   * Existing encrypted values (retained from previous save) are left untouched.
   */
  private async encryptNewAndFixedSecrets(
    merged: Record<string, string>,
    providedValues: Record<string, string>,
    orgFields: ConfigField[],
  ): Promise<void> {
    for (const field of orgFields) {
      if (field.type !== 'secret') continue;

      const isFixed = isSystemFixedField(field);
      const isNewlyProvided = Boolean(providedValues[field.key]);

      if (isFixed || isNewlyProvided) {
        merged[field.key] = await this.credentialEncryption.encrypt(
          merged[field.key],
        );
      }
    }
  }
}
