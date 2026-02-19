import { Injectable } from '@nestjs/common';
import { McpCredentialEncryptionPort } from '../ports/mcp-credential-encryption.port';
import { ConfigField } from '../../domain/value-objects/integration-config-schema';
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
      if (field.value !== undefined) {
        merged[field.key] = field.value;
      }
    }
    return merged;
  }

  /**
   * Validates that all required fields have non-empty values.
   * Throws McpMissingRequiredConfigError if any required fields are missing.
   */
  validateRequiredFields(
    orgFields: ConfigField[],
    values: Record<string, string>,
  ): void {
    const missing = orgFields
      .filter((field) => field.required && !values[field.key])
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
    const merged: Record<string, string> = {};

    for (const field of orgFields) {
      // Fixed-value fields always use schema value
      if (field.value !== undefined) {
        merged[field.key] = field.value;
        continue;
      }

      const provided = providedValues[field.key];
      const existing = existingValues[field.key];

      if (field.type === 'secret') {
        if (provided !== undefined && provided !== '') {
          // New secret value — encrypt it
          merged[field.key] = await this.credentialEncryption.encrypt(provided);
        } else if (existing !== undefined) {
          // Keep existing encrypted value
          merged[field.key] = existing;
        }
      } else {
        // Non-secret: use provided value if given, otherwise keep existing
        if (provided !== undefined) {
          merged[field.key] = provided;
        } else if (existing !== undefined) {
          merged[field.key] = existing;
        }
      }
    }

    // Re-encrypt fixed-value secret fields
    const fixedSecretFields = orgFields.filter(
      (f) => f.value !== undefined && f.type === 'secret',
    );
    for (const field of fixedSecretFields) {
      merged[field.key] = await this.credentialEncryption.encrypt(
        merged[field.key],
      );
    }

    this.validateRequiredFields(orgFields, merged);

    return merged;
  }
}
