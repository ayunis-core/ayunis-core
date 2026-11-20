import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateThreadDto } from './create-thread.dto';

const NOTIFICATION_ID = '3f0c8a52-7d1e-4b8a-9c2f-5e6d7a8b9c0d';
const ROUTINE_ID = '8b1d2c3e-4f5a-4b6c-8d7e-9f0a1b2c3d4e';
const RELEASE_NOTE_ID = '5a6b7c8d-9e0f-4a1b-8c2d-3e4f5a6b7c8d';

async function errorsFor(body: Record<string, unknown>) {
  // The global ValidationPipe's options; Nest turns forbidUnknownValues off.
  const errors = await validate(plainToInstance(CreateThreadDto, body), {
    whitelist: true,
    forbidUnknownValues: false,
  });
  return errors.map((error) => error.property);
}

describe('CreateThreadDto origin', () => {
  it('accepts a chat about a notification', async () => {
    expect(
      await errorsFor({
        origin: { kind: 'notification', notificationId: NOTIFICATION_ID },
      }),
    ).toEqual([]);
  });

  it('accepts a chat about a release note', async () => {
    expect(
      await errorsFor({
        origin: { kind: 'release_note', releaseNoteId: RELEASE_NOTE_ID },
      }),
    ).toEqual([]);
  });

  it('rejects a release-note origin without a valid release note id', async () => {
    expect(
      await errorsFor({
        origin: { kind: 'release_note', releaseNoteId: 'not-a-uuid' },
      }),
    ).toEqual(['origin']);
  });

  it.each(['profile', 'first_skill'])(
    'accepts an onboarding chat for the %s stage',
    async (stage) => {
      expect(
        await errorsFor({ origin: { kind: 'onboarding', stage } }),
      ).toEqual([]);
    },
  );

  it('keeps the kind of an onboarding origin for the use case', async () => {
    const dto = plainToInstance(CreateThreadDto, {
      origin: { kind: 'onboarding', stage: 'first_skill' },
    });

    expect(dto.origin).toEqual({ kind: 'onboarding', stage: 'first_skill' });
  });

  it('accepts a thread without an origin', async () => {
    expect(await errorsFor({})).toEqual([]);
  });

  it.each([
    { kind: 'routine', routineId: ROUTINE_ID },
    { kind: 'chat' },
    { kind: 'unknown', notificationId: NOTIFICATION_ID },
    { notificationId: NOTIFICATION_ID },
    { kind: 'onboarding', notificationId: NOTIFICATION_ID },
  ])('rejects an origin a client may not set: %p', async (origin) => {
    expect(await errorsFor({ origin })).toEqual(['origin']);
  });

  it.each([
    [[]],
    [[{ kind: 'notification', notificationId: NOTIFICATION_ID }]],
  ])('rejects an origin sent as a list: %p', async (origin) => {
    expect(await errorsFor({ origin })).toEqual(['origin']);
  });

  it.each([undefined, null, 'not-a-uuid'])(
    'rejects a notification origin with the notification id %p',
    async (notificationId) => {
      expect(
        await errorsFor({ origin: { kind: 'notification', notificationId } }),
      ).toEqual(['origin']);
    },
  );

  it.each([undefined, null, 'knowledge', 'PROFILE'])(
    'rejects an onboarding origin with the stage %p',
    async (stage) => {
      expect(
        await errorsFor({ origin: { kind: 'onboarding', stage } }),
      ).toEqual(['origin']);
    },
  );
});
