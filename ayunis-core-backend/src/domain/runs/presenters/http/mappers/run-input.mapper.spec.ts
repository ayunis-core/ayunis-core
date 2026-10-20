import { RunInputMapper } from './run-input.mapper';
import {
  RunUserInput,
  RunToolResultInput,
} from 'src/domain/runs/domain/run-input.entity';
import type { SendMessageDto } from 'src/domain/runs/presenters/http/dto/send-message.dto';
import { randomUUID } from 'crypto';

it('transfers upload bytes out of Multer file records without copying them', () => {
  const buffer = Buffer.from('phone photo');
  const file = { buffer, mimetype: 'image/jpeg' } as Express.Multer.File;
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
  expect(file.buffer).toHaveLength(0);
});

it('discards unused upload bytes on a tool-result continuation', () => {
  const file = {
    buffer: Buffer.from('unused photo'),
    mimetype: 'image/jpeg',
  } as Express.Multer.File;
  const dto = {
    threadId: randomUUID(),
    toolResult: { toolId: 'chart', toolName: 'bar_chart', result: '{}' },
  } as SendMessageDto;
  expect(RunInputMapper.toCommand(dto, [file])).toBeInstanceOf(
    RunToolResultInput,
  );
  expect(file.buffer).toHaveLength(0);
});
