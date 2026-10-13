import { randomUUID } from 'crypto';
import { MessageContentInvalidError } from 'src/domain/messages/application/messages.errors';
import { MAX_IMAGE_SIZE_BYTES } from 'src/domain/messages/application/util/provider-image-limit.helper';
import { CreateUserMessageCommand } from './create-user-message.command';

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

const png = (size: number) => {
  const buffer = Buffer.alloc(size);
  Buffer.from(PNG_SIGNATURE).copy(buffer);
  return { buffer, contentType: 'image/png' };
};

describe('CreateUserMessageCommand', () => {
  it('accepts an image at the strictest provider limit', () => {
    expect(
      () =>
        new CreateUserMessageCommand(randomUUID(), undefined, [
          png(MAX_IMAGE_SIZE_BYTES),
        ]),
    ).not.toThrow();
  });

  it('rejects an image the strictest provider would refuse on a later turn', () => {
    expect(
      () =>
        new CreateUserMessageCommand(randomUUID(), undefined, [
          png(MAX_IMAGE_SIZE_BYTES + 1),
        ]),
    ).toThrow(MessageContentInvalidError);
  });
});
