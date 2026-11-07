import type { UUID } from 'crypto';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';
import { validateToolParams } from 'src/common/validators/tool-params.validator';
import {
  NOTIFICATION_BODY_MAX_LENGTH,
  NOTIFICATION_HEADLINE_MAX_LENGTH,
  NOTIFICATION_SUBHEADLINE_MAX_LENGTH,
} from 'src/domain/notifications/domain/notifications.constants';
import { Tool } from 'src/domain/tools/domain/tool.entity';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';

/** At most this many notifications per routine run, nudges included. */
export const SEND_NOTIFICATION_LIMIT_PER_RUN = 3;

const sendNotificationToolParameters = {
  type: 'object' as const,
  properties: {
    headline: {
      type: 'string' as const,
      minLength: 1,
      maxLength: NOTIFICATION_HEADLINE_MAX_LENGTH,
      description: 'Short headline naming the finding.',
    },
    subheadline: {
      type: 'string' as const,
      minLength: 1,
      maxLength: NOTIFICATION_SUBHEADLINE_MAX_LENGTH,
      description:
        'One line of context, for example the source and date of the finding.',
    },
    body: {
      type: 'string' as const,
      minLength: 1,
      maxLength: NOTIFICATION_BODY_MAX_LENGTH,
      description:
        'Markdown summary of what is new and why it matters to the user, with inline links to the original documents.',
    },
  },
  required: ['headline', 'subheadline', 'body'] as const,
  additionalProperties: false,
} as const satisfies JSONSchema;

type SendNotificationToolParameters = FromSchema<
  typeof sendNotificationToolParameters
>;

/** The routine a notification is sent from; null once it was deleted. */
export class SendNotificationOrigin {
  constructor(public readonly routineId: UUID | null) {}
}

/** Posts a notification from a routine run to its owner's inbox. */
export class SendNotificationTool extends Tool {
  constructor(public readonly origin: SendNotificationOrigin) {
    super({
      name: ToolType.SEND_NOTIFICATION,
      description: `Send a notification to the user's inbox. Use it only for findings that are important to the user. At most ${SEND_NOTIFICATION_LIMIT_PER_RUN} notifications per run.`,
      descriptionLong: [
        'A notification is the only output of this run the user sees. Write it in the language of the task.',
        'Give it a short headline that names the finding, a subheadline with the source or date, and a markdown body that summarises what is new and why it matters to the user, with inline links to the original documents, for example [Gesetz- und Verordnungsblatt Nr. 34](https://example.org/gvbl/34).',
        `Send one notification per distinct finding, or one that combines related findings; never more than ${SEND_NOTIFICATION_LIMIT_PER_RUN} per run. Never send a notification only to say that nothing relevant was found.`,
      ].join(' '),
      parameters: sendNotificationToolParameters,
      type: ToolType.SEND_NOTIFICATION,
    });
  }

  validateParams(
    params: Record<string, unknown>,
  ): SendNotificationToolParameters {
    return validateToolParams<SendNotificationToolParameters>(
      this.parameters,
      params,
    );
  }

  get returnsPii(): boolean {
    return false;
  }
}
