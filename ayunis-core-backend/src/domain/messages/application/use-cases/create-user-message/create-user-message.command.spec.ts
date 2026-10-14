import { randomUUID } from 'crypto';
import { MessageContentInvalidError } from 'src/domain/messages/application/messages.errors';
import { MAX_IMAGE_SIZE_BYTES } from 'src/domain/messages/application/utils/image-upload.policy';
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

it.each([
  ['mismatched MIME', { ...png(8), contentType: 'image/jpeg' }],
  ['unsupported MIME', { ...png(8), contentType: 'image/svg+xml' }],
  ['empty image', { buffer: Buffer.alloc(0), contentType: 'image/png' }],
])('rejects %s with the domain upload error', (_label, image) => {
  expect(
    () => new CreateUserMessageCommand(randomUUID(), undefined, [image]),
  ).toThrow(
    expect.objectContaining({
      code: 'MESSAGE_CONTENT_INVALID',
      statusCode: 400,
    }),
  );
});
it('rejects an empty message with the domain error', () => {
  expect(() => new CreateUserMessageCommand(randomUUID(), ' ')).toThrow(
    MessageContentInvalidError,
  );
});
it('accepts a valid image-only message', () => {
  expect(
    new CreateUserMessageCommand(randomUUID(), undefined, [png(8)])
      .pendingImages,
  ).toHaveLength(1);
});
