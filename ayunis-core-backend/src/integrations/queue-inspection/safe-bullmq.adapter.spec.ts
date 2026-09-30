import { Queue } from 'bullmq';
import {
  SafeBullMQAdapter,
  sanitizeFailureText,
  sanitizeQueueJobData,
} from './safe-bullmq.adapter';

describe('SafeBullMQAdapter', () => {
  const queue = Object.create(Queue.prototype) as Queue;
  const adapter = new SafeBullMQAdapter(queue);

  it('enforces read-only mode for every registered queue', () => {
    expect(adapter.readOnlyMode).toBe(true);
    expect(adapter.allowRetries).toBe(false);
  });

  it('retains the required inspection states', () => {
    expect(adapter.getJobStatuses()).toEqual(
      expect.arrayContaining([
        'waiting',
        'active',
        'delayed',
        'completed',
        'failed',
      ]),
    );
  });

  it('exposes only the source id for document and URL jobs', () => {
    const data = {
      sourceId: '11111111-2222-3333-4444-555555555555',
      orgId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      userId: '99999999-8888-7777-6666-555555555555',
      minioPath: 'private/documents/contract.pdf',
      fileName: 'confidential-contract.pdf',
      rootUrl: 'https://internal.example.gov/private',
      credentials: { token: 'never-display-this' },
    };

    expect(sanitizeQueueJobData(data)).toEqual({ sourceId: data.sourceId });
  });

  it('exposes batch and source ids without spreadsheet metadata', () => {
    const data = {
      uploadId: '11111111-2222-3333-4444-555555555555',
      fileName: 'salary-planning.xlsx',
      minioPath: 'private/spreadsheets/salary-planning.xlsx',
      targets: [
        {
          sourceId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
          sheetName: 'Executive salaries',
        },
        {
          sourceId: '99999999-8888-7777-6666-555555555555',
          sheetName: 'Credentials',
        },
      ],
    };

    expect(sanitizeQueueJobData(data)).toEqual({
      uploadId: data.uploadId,
      sourceIds: data.targets.map((target) => target.sourceId),
    });
  });

  it('redacts unrecognized payloads and every return value', () => {
    expect(adapter.format('data', { password: 'secret' })).toEqual({
      redacted: true,
    });
    expect(adapter.format('returnValue', { extractedText: 'private' })).toEqual(
      { redacted: true },
    );
  });

  it('redacts payload-derived values from failure details', () => {
    const data = {
      sourceId: '11111111-2222-3333-4444-555555555555',
      rootUrl: 'https://internal.example.gov/private?token=secret',
      fileName: 'confidential-contract.pdf',
      credentials: { token: 'provider-secret' },
    };

    expect(
      sanitizeFailureText(
        'Fetch failed for https://internal.example.gov/private?token=secret in confidential-contract.pdf using provider-secret',
        data,
      ),
    ).toBe('Fetch failed for [REDACTED] in [REDACTED] using [REDACTED]');
  });
});
