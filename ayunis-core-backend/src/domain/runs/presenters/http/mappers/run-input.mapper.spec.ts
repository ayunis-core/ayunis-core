import { RunInputMapper } from './run-input.mapper';
import {
  RunUserInput,
  RunToolResultInput,
} from 'src/domain/runs/domain/run-input.entity';
import type { SendMessageDto } from 'src/domain/runs/presenters/http/dto/send-message.dto';
import { randomUUID } from 'crypto';
import { UploadBytes } from 'src/domain/runs/presenters/http/upload-bytes';

it('takes upload bytes out of the storage holder without copying them', () => {
  const buffer = Buffer.from('phone photo');
  const bytes = new UploadBytes(buffer);
  const file = {
    bytes,
    mimetype: 'image/jpeg',
  } as unknown as Express.Multer.File;
  const input = RunInputMapper.toCommand(
    { threadId: randomUUID(), imageAltTexts: ['Town hall'] },
    [file],
  );
  expect(input).toBeInstanceOf(RunUserInput);
  expect((input as RunUserInput).pendingImages[0]).toEqual({
    buffer,
    contentType: 'image/jpeg',
    altText: 'Town hall',
  });
  expect((input as RunUserInput).pendingImages[0].buffer).toBe(buffer);
  expect(bytes.isEmpty).toBe(true);
});

it('refuses a file record that did not come through the image storage', () => {
  const file = {
    buffer: Buffer.from('raw'),
    mimetype: 'image/jpeg',
  } as Express.Multer.File;
  expect(() =>
    RunInputMapper.toCommand({ threadId: randomUUID() }, [file]),
  ).toThrow(TypeError);
});

it('discards unused upload bytes on a tool-result continuation', () => {
  const bytes = new UploadBytes(Buffer.from('unused photo'));
  const file = {
    bytes,
    mimetype: 'image/jpeg',
  } as unknown as Express.Multer.File;
  const dto = {
    threadId: randomUUID(),
    toolResult: { toolId: 'chart', toolName: 'bar_chart', result: '{}' },
  } as SendMessageDto;
  expect(RunInputMapper.toCommand(dto, [file])).toBeInstanceOf(
    RunToolResultInput,
  );
  expect(bytes.isEmpty).toBe(true);
});
