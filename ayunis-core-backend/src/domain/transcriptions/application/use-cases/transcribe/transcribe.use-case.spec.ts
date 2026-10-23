import type { UUID } from 'crypto';
import { TranscribeUseCase } from './transcribe.use-case';
import { TranscribeCommand } from './transcribe.command';
import type { TranscriptionPort } from 'src/domain/transcriptions/application/ports/transcription.port';
import type { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';

const ORG_ID = '00000000-0000-4000-8000-000000000001' as UUID;
const USER_ID = '00000000-0000-4000-8000-000000000002' as UUID;

function setup(store: Record<string, unknown>) {
  const transcriptionPort = {
    transcribe: jest.fn().mockResolvedValue('Hallo Bamberg'),
  } as unknown as jest.Mocked<TranscriptionPort>;
  const contextService = {
    get: jest.fn((key: string) => store[key]),
  } as unknown as ContextService;
  return {
    useCase: new TranscribeUseCase(transcriptionPort, contextService),
    transcriptionPort,
  };
}

const command = new TranscribeCommand({
  file: Buffer.from('audio'),
  fileName: 'Aufnahme 1.mp3',
  mimeType: 'audio/mpeg',
});

describe('TranscribeUseCase', () => {
  it('transcribes inside the document-processing worker context, which carries no role', async () => {
    const { useCase } = setup({ orgId: ORG_ID, userId: USER_ID });

    await expect(useCase.execute(command)).resolves.toBe('Hallo Bamberg');
  });

  it('transcribes for an authenticated user request', async () => {
    const { useCase } = setup({
      orgId: ORG_ID,
      userId: USER_ID,
      role: 'user',
      systemRole: 'customer',
    });

    await expect(useCase.execute(command)).resolves.toBe('Hallo Bamberg');
  });

  it('rejects a call without an organization context', async () => {
    const { useCase, transcriptionPort } = setup({});

    await expect(useCase.execute(command)).rejects.toBeInstanceOf(
      UnauthorizedAccessError,
    );
    expect(transcriptionPort.transcribe).not.toHaveBeenCalled();
  });
});
