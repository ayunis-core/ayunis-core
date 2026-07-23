import { getSchemaPath } from '@nestjs/swagger';
import {
  RunSessionResponseDto,
  RunMessageResponseDto,
  RunErrorResponseDto,
  RunThreadResponseDto,
  RunMasksResponseDto,
} from './dto/run-response.dto';

export const SEND_MESSAGE_API_OPERATION = {
  summary: 'Send a message with optional images and receive streaming response',
  description:
    'Sends a user message (with optional image attachments) and returns a server-sent events stream with the AI response. Images are processed transactionally with the message.',
};

export const SEND_MESSAGE_API_BODY = {
  schema: {
    type: 'object' as const,
    required: ['threadId'],
    properties: {
      threadId: { type: 'string', format: 'uuid' },
      text: {
        type: 'string',
        description: 'Message text (optional if images provided)',
      },
      images: {
        type: 'array',
        items: { type: 'string', format: 'binary' },
        description:
          'Image files to attach (max 10, max 10MB each, 50MB total)',
      },
      imageAltTexts: {
        type: 'string',
        description: 'JSON array of alt texts matching image order',
      },
      toolResult: {
        type: 'string',
        description: 'JSON object for tool result input',
      },
      skillId: {
        type: 'string',
        format: 'uuid',
        description: 'Skill ID to activate for this message',
      },
      streaming: { type: 'boolean', default: true },
    },
  },
};

export const SEND_MESSAGE_SSE_RESPONSE = {
  status: 200,
  description: 'Server-sent events stream with discriminated response types',
  content: {
    'text/event-stream': {
      schema: {
        oneOf: [
          { $ref: getSchemaPath(RunSessionResponseDto) },
          { $ref: getSchemaPath(RunMessageResponseDto) },
          { $ref: getSchemaPath(RunErrorResponseDto) },
          { $ref: getSchemaPath(RunThreadResponseDto) },
          { $ref: getSchemaPath(RunMasksResponseDto) },
        ],
        discriminator: {
          propertyName: 'type',
          mapping: {
            session: getSchemaPath(RunSessionResponseDto),
            message: getSchemaPath(RunMessageResponseDto),
            error: getSchemaPath(RunErrorResponseDto),
            thread: getSchemaPath(RunThreadResponseDto),
            masks: getSchemaPath(RunMasksResponseDto),
          },
        },
      },
    },
  },
  headers: {
    'Content-Type': {
      description: 'Content type for server-sent events',
      schema: { type: 'string', example: 'text/event-stream' },
    },
    'Cache-Control': {
      description: 'Cache control header',
      schema: { type: 'string', example: 'no-cache' },
    },
    Connection: {
      description: 'Connection type',
      schema: { type: 'string', example: 'keep-alive' },
    },
  },
};
