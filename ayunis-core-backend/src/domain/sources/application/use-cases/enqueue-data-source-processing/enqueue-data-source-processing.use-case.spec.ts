import { randomUUID } from 'crypto';
import { createPinoLoggerMock } from 'src/common/testing/pino-logger.mock';
import { EnqueueDataSourceProcessingUseCase } from './enqueue-data-source-processing.use-case';
import { EnqueueDataSourceProcessingCommand } from './enqueue-data-source-processing.command';
import type { DataSourceProcessingPort } from '../../ports/data-source-processing.port';
import {
  EmptyFileDataError,
  UnexpectedSourceError,
} from '../../sources.errors';

describe('EnqueueDataSourceProcessingUseCase', () => {
  const orgId = randomUUID();
  const userId = randomUUID();
  const uploadId = randomUUID();

  let port: jest.Mocked<DataSourceProcessingPort>;
  let useCase: EnqueueDataSourceProcessingUseCase;

  function command(): EnqueueDataSourceProcessingCommand {
    return new EnqueueDataSourceProcessingCommand({
      uploadId,
      orgId,
      userId,
      minioPath: `${orgId}/processing/${uploadId}/haushalt.xlsx`,
      fileName: 'haushalt.xlsx',
      kind: 'spreadsheet',
      targets: [{ sourceId: randomUUID(), sheetName: 'Plan 2026' }],
    });
  }

  beforeEach(() => {
    port = {
      enqueue: jest.fn().mockResolvedValue(undefined),
    };
    useCase = new EnqueueDataSourceProcessingUseCase(
      createPinoLoggerMock(),
      port,
    );
  });

  it('enqueues one job carrying the full upload batch', async () => {
    const cmd = command();

    await useCase.execute(cmd);

    expect(port.enqueue).toHaveBeenCalledTimes(1);
    expect(port.enqueue).toHaveBeenCalledWith({
      uploadId: cmd.uploadId,
      orgId: cmd.orgId,
      userId: cmd.userId,
      minioPath: cmd.minioPath,
      fileName: cmd.fileName,
      kind: cmd.kind,
      targets: cmd.targets,
    });
  });

  it('wraps unexpected enqueue failures in UnexpectedSourceError', async () => {
    port.enqueue.mockRejectedValue(new Error('redis down'));

    await expect(useCase.execute(command())).rejects.toBeInstanceOf(
      UnexpectedSourceError,
    );
  });

  it('rethrows application errors unchanged', async () => {
    port.enqueue.mockRejectedValue(new EmptyFileDataError('haushalt.xlsx'));

    await expect(useCase.execute(command())).rejects.toBeInstanceOf(
      EmptyFileDataError,
    );
  });
});
