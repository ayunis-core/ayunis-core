import { randomUUID } from 'node:crypto';
import { permitEmbeddingModel } from '../../src/clients/api/models.client';
import {
  createRecording,
  getRecording,
  requestRecordingDeletion,
  requestRecordingUpload,
  uploadRecordingAudio,
} from '../../src/clients/api/recordings.client';
import {
  countOrphanedAudioRows,
  findRecordingAudioRows,
  findRecordingAudioSourceId,
} from '../../src/clients/database.client';
import {
  HELD_TRANSCRIPTION_MARKER,
  transcriptionMock,
} from '../../src/clients/mistral-transcription-mock.client';
import { objectExists } from '../../src/clients/object-storage.client';
import { createSilentWav } from '../../src/factories/audio.factory';
import { test, expect } from '../../src/fixtures/test';

// The e2e stack caps recordings at 30 seconds (AUDIO_MAX_DURATION_SECONDS) and
// answers transcriptions from the contract server with a two-speaker meeting.
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

test('a recording created with its audio is transcribed into speaker turns that keep the labels apart from the text', async ({
  api,
  page,
}) => {
  test.setTimeout(120_000);
  await permitEmbeddingModel(api);
  const key = randomUUID().slice(0, 8);

  await page.goto('/recordings');
  await page.getByTestId('recording-create').first().click();
  await page.getByTestId('entity-form-name').fill(`Gemeinderat ${key}`);
  await page.getByTestId('recording-create-audio').setInputFiles({
    name: `gemeinderat-${key}.wav`,
    mimeType: 'audio/wav',
    buffer: createSilentWav(5),
  });
  await page.getByTestId('create-entity-submit').click();
  await expect(page.getByTestId('recording-page')).toBeVisible();
  const recordingId = new URL(page.url()).pathname.split('/').pop()!;

  await expect(page.getByTestId('recording-status')).toHaveAttribute(
    'data-status',
    'ready',
    { timeout: 60_000 },
  );
  const turns = page.getByTestId('recording-transcript-turn');
  await expect(turns).toHaveCount(3);
  expect(
    await turns.evaluateAll((items) =>
      items.map((item) => item.getAttribute('data-speaker')),
    ),
  ).toEqual(['speaker_0', 'speaker_1', 'speaker_0']);
  await expect(page.getByTestId('recording-transcript-time')).toHaveText([
    '00:00',
    '00:01',
    '00:03',
  ]);

  const audio = await findRecordingAudioRows(recordingId);
  expect(audio?.segments).toEqual([
    {
      speaker: 'speaker_0',
      text: 'Willkommen zur Sitzung des Gemeinderats.',
      start: 0.2,
      end: 1.4,
    },
    {
      speaker: 'speaker_1',
      text: 'Danke, wir beginnen mit dem Haushalt.',
      start: 1.6,
      end: 2.8,
    },
    {
      speaker: 'speaker_0',
      text: 'Der Haushalt ist beschlossen.',
      start: 3,
      end: 3.9,
    },
  ]);
  // Every search index entry of the transcript leads back to a time range of
  // the recording.
  expect(audio?.indexEntries).toBeGreaterThan(0);
  expect(audio?.chunkRanges).toEqual([{ start: 0.2, end: 3.9 }]);

  // A recording keeps one audio file.
  const second = await requestRecordingUpload(api, recordingId, {
    fileName: `zweite-${key}.wav`,
    mimeType: 'audio/wav',
    fileSize: 1024,
  });
  expect(second.status()).toBe(409);
});

test('a recording over the duration cap fails asking to cut it, and files that are no audio or too large are refused before upload', async ({
  api,
  page,
}) => {
  test.setTimeout(120_000);
  await permitEmbeddingModel(api);
  const key = randomUUID().slice(0, 8);
  const recording = await createRecording(api, {
    ownerType: 'personal',
    name: `Haushaltsdebatte ${key}`,
  });

  const notAudio = await requestRecordingUpload(api, recording.id, {
    fileName: `protokoll-${key}.pdf`,
    mimeType: 'application/pdf',
    fileSize: 1024,
  });
  expect(notAudio.status()).toBe(400);
  expect(await notAudio.json()).toMatchObject({ code: 'UNSUPPORTED_FILE_TYPE' });
  const tooLarge = await requestRecordingUpload(api, recording.id, {
    fileName: `sitzung-${key}.mp3`,
    mimeType: 'audio/mpeg',
    fileSize: MAX_UPLOAD_BYTES + 1,
  });
  expect(tooLarge.status()).toBe(413);
  expect(await getRecording(api, recording.id)).toMatchObject({
    status: 'uploading',
  });

  await uploadRecordingAudio(api, recording.id, {
    name: `haushaltsdebatte-${key}.wav`,
    mimeType: 'audio/wav',
    buffer: createSilentWav(40),
  });
  await expect
    .poll(async () => (await getRecording(api, recording.id)).status, {
      timeout: 60_000,
    })
    .toBe('failed');

  await page.goto(`/recordings/${recording.id}`);
  await expect(page.getByTestId('recording-failure')).toHaveAttribute(
    'data-failure-code',
    'RECORDING_TOO_LONG',
  );
  await expect(page.getByTestId('recording-transcript-turn')).toHaveCount(0);
});

test('deleting a recording while it is transcribed removes its original from storage and its transcript and index from the database', async ({
  api,
}) => {
  test.setTimeout(120_000);
  await permitEmbeddingModel(api);
  const key = randomUUID().slice(0, 8);
  const fileName = `${HELD_TRANSCRIPTION_MARKER}-${key}.wav`;
  const recording = await createRecording(api, {
    ownerType: 'personal',
    name: `Ältestenrat ${key}`,
  });
  await uploadRecordingAudio(api, recording.id, {
    name: fileName,
    mimeType: 'audio/wav',
    buffer: createSilentWav(5),
  });

  try {
    await expect
      .poll(() => transcriptionMock.held(api), { timeout: 60_000 })
      .toContain(fileName);
    const sourceId = await findRecordingAudioSourceId(recording.id);
    const storageKey = (await findRecordingAudioRows(recording.id))?.storageKey;
    expect(sourceId).not.toBeNull();
    expect(storageKey).toBeTruthy();
    expect(await objectExists(storageKey!)).toBe(true);
    const transcribing = await getRecording(api, recording.id);
    expect(transcribing.status).toBe('transcribing');
    // Its summary waits for the transcript and is not shown before it.
    expect(transcribing.summary).toBeUndefined();

    expect(
      (await requestRecordingDeletion(api, recording.id)).status(),
    ).toBe(204);

    expect(await objectExists(storageKey!)).toBe(false);
    expect(await countOrphanedAudioRows([sourceId!])).toBe(0);
  } finally {
    await transcriptionMock.release(api, fileName);
  }
});
