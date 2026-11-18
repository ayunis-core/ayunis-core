import type { FromSchema, JSONSchema } from 'json-schema-to-ts';
import { PiiCategory } from 'src/common/anonymization/domain/pii-category.enum';
import { validateToolParams } from 'src/common/validators/tool-params.validator';
import { Tool } from 'src/domain/tools/domain/tool.entity';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';

const addAnonymizationExceptionToolParameters = {
  type: 'object' as const,
  properties: {
    category: {
      type: 'string' as const,
      enum: Object.values(PiiCategory),
      description:
        'The PII category the word is masked as. For a placeholder such as {{pii:LOCATION_1}} this is the lowercase category in it (location).',
    },
    word: {
      type: 'string' as const,
      minLength: 1,
      description:
        'The word that should no longer be masked, exactly as it appears in the conversation. If it was masked, copy its placeholder verbatim (e.g. {{pii:LOCATION_1}}). It is taken literally and compared case-insensitively against the whole detected value, so it is not a pattern: call the tool once per spelling variant the admin asked for.',
    },
  },
  required: ['category', 'word'],
  additionalProperties: false,
} as const satisfies JSONSchema;

export type AddAnonymizationExceptionToolParameters = FromSchema<
  typeof addAnonymizationExceptionToolParameters
>;

export class AddAnonymizationExceptionTool extends Tool {
  constructor() {
    super({
      name: ToolType.ADD_ANONYMIZATION_EXCEPTION,
      description:
        "Propose an exception to the organization's anonymization whitelist so that a word is no longer masked in anonymous mode, for everyone in the organization. Use it only when the admin explicitly asks to stop masking a specific word. The word is added to the category's existing rule; it can only add exceptions. The admin reviews the proposal in a card and nothing is saved until they confirm it.",
      parameters: addAnonymizationExceptionToolParameters,
      type: ToolType.ADD_ANONYMIZATION_EXCEPTION,
    });
  }

  validateParams(
    params: Record<string, unknown>,
  ): AddAnonymizationExceptionToolParameters {
    return validateToolParams<AddAnonymizationExceptionToolParameters>(
      this.parameters,
      params,
    );
  }

  get returnsPii(): boolean {
    return false;
  }
}
