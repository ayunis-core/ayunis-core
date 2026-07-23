import { BadRequestException } from '@nestjs/common';
import type { UUID } from 'crypto';
import type { SendMessageDto } from '../dto/send-message.dto';
import { SendMessageRequestValidator } from './send-message-request.validator';

const THREAD_ID = 'f4b2e1d0-3c5a-4b7e-9d8f-1a2b3c4d5e6f' as UUID;

function dtoWith(overrides: Partial<SendMessageDto> = {}): SendMessageDto {
  return { threadId: THREAD_ID, ...overrides };
}

function fileOfSize(size: number): Express.Multer.File {
  return { size } as Express.Multer.File;
}

describe('SendMessageRequestValidator', () => {
  const validator = new SendMessageRequestValidator();

  it('rejects a request without text, images, tool result, or skillId', () => {
    expect(() => validator.validate(dtoWith(), [])).toThrow(
      BadRequestException,
    );
  });

  it('rejects whitespace-only text as empty input', () => {
    expect(() => validator.validate(dtoWith({ text: '   ' }), [])).toThrow(
      BadRequestException,
    );
  });

  it('accepts a text-only message', () => {
    expect(() =>
      validator.validate(
        dtoWith({ text: 'Wie beantrage ich einen Pass?' }),
        [],
      ),
    ).not.toThrow();
  });

  it('accepts an image-only message', () => {
    expect(() =>
      validator.validate(dtoWith(), [fileOfSize(1024)]),
    ).not.toThrow();
  });

  it('accepts a tool-result-only message', () => {
    const dto = dtoWith({
      toolResult: {
        toolId: 'tool-1',
        toolName: 'search',
        result: '{}',
      } as SendMessageDto['toolResult'],
    });

    expect(() => validator.validate(dto, [])).not.toThrow();
  });

  it('accepts a skill-only message', () => {
    expect(() =>
      validator.validate(
        dtoWith({ skillId: '7a9c4e21-1b3d-4f5a-9c8e-2d4f6a8b0c13' }),
        [],
      ),
    ).not.toThrow();
  });

  it('rejects uploads whose combined size exceeds the total limit', () => {
    const files = [fileOfSize(30 * 1024 * 1024), fileOfSize(21 * 1024 * 1024)];

    expect(() => validator.validate(dtoWith(), files)).toThrow(
      BadRequestException,
    );
  });

  it('accepts uploads exactly at the total size limit', () => {
    const files = [fileOfSize(50 * 1024 * 1024)];

    expect(() => validator.validate(dtoWith(), files)).not.toThrow();
  });
});
