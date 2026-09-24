import { BullModule, getQueueToken } from '@nestjs/bullmq';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import type { INestApplication } from '@nestjs/common';
import type { AddressInfo } from 'net';
import { Queue } from 'bullmq';
import { QueueInspectionModule } from './queue-inspection.module';
import { QUEUE_INSPECTION_QUEUE_NAMES } from './queue-inspection.constants';
import { authenticationConfig } from 'src/config/authentication.config';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { IpAllowlistRecord } from 'src/iam/ip-allowlist/infrastructure/persistence/postgres/schema/ip-allowlist.record';

describe('queue inspection HTTP boundary', () => {
  const findIpAllowlistRecord = jest.fn().mockResolvedValue(null);
  let app: INestApplication;
  let baseUrl: string;
  let jwtService: JwtService;

  beforeAll(async () => {
    process.env.JWT_SECRET = 'queue-inspection-integration-secret';
    process.env.COOKIE_SECRET = 'queue-inspection-cookie-secret';

    const builder = Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [authenticationConfig],
        }),
        BullModule.forRoot({
          connection: { host: '127.0.0.1', port: 1 },
        }),
        QueueInspectionModule,
      ],
    });

    for (const queueName of QUEUE_INSPECTION_QUEUE_NAMES) {
      const queue = createQueueStub(queueName);
      builder.overrideProvider(getQueueToken(queueName)).useValue(queue);
    }
    builder.overrideProvider(getRepositoryToken(IpAllowlistRecord)).useValue({
      findOne: findIpAllowlistRecord,
    });

    const moduleRef = await builder.compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    await app.listen(0, '127.0.0.1');

    const address = app.getHttpServer().address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
    jwtService = app.get(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects unauthenticated requests', async () => {
    const response = await fetch(`${baseUrl}/api/internal/queues/`);

    expect(response.status).toBe(401);
  });

  it('rejects authenticated users without the super admin role', async () => {
    const response = await requestAs(SystemRole.CUSTOMER);

    expect(response.status).toBe(403);
  });

  it('rejects an authorized operator outside the organization IP allowlist', async () => {
    const orgId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
    findIpAllowlistRecord.mockResolvedValueOnce({
      id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
      orgId,
      // eslint-disable-next-line sonarjs/no-hardcoded-ip -- denied test fixture CIDR
      cidrs: ['10.0.0.0/8'],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const response = await requestAs(
      SystemRole.SUPER_ADMIN,
      '/api/internal/queues/',
      'GET',
      orgId,
    );

    expect(response.status).toBe(403);
  });

  it('serves the dashboard to an authorized operator', async () => {
    const response = await requestAs(SystemRole.SUPER_ADMIN);

    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toContain('Ayunis Core Queues');
  });

  it('lists all queues with operational fields and sanitized job data', async () => {
    const response = await requestAs(
      SystemRole.SUPER_ADMIN,
      '/api/internal/queues/api/queues?activeQueue=document-processing&status=failed&page=1&jobsPerPage=10',
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      queues: Array<{
        name: string;
        jobs: Array<Record<string, unknown>>;
      }>;
    };
    expect(body.queues.map((queue) => queue.name)).toEqual(
      QUEUE_INSPECTION_QUEUE_NAMES,
    );
    expect(body.queues[0].jobs[0]).toEqual(
      expect.objectContaining({
        id: '11111111-2222-3333-4444-555555555555',
        timestamp: 1_700_000_000_000,
        processedOn: 1_700_000_001_000,
        finishedOn: 1_700_000_002_000,
        attempts: 2,
        progress: 75,
        failedReason: 'OCR provider timed out for [REDACTED]',
        stacktrace: ['Error: OCR provider timed out for [REDACTED]'],
        data: { sourceId: '11111111-2222-3333-4444-555555555555' },
        returnValue: { redacted: true },
      }),
    );
  });

  it('rejects queue mutation endpoints for an authorized operator', async () => {
    const response = await requestAs(
      SystemRole.SUPER_ADMIN,
      '/api/internal/queues/api/queues/document-processing/pause',
      'PUT',
    );

    expect(response.status).toBe(405);
  });

  function requestAs(
    systemRole: SystemRole,
    path = '/api/internal/queues/',
    method = 'GET',
    orgId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  ): Promise<Response> {
    const token = jwtService.sign({
      sub: '11111111-2222-3333-4444-555555555555',
      email: 'operator@example.gov',
      emailVerified: true,
      orgId,
      role: UserRole.ADMIN,
      systemRole,
      name: 'Queue Operator',
    });
    return fetch(`${baseUrl}${path}`, {
      method,
      headers: { cookie: `access_token=${token}` },
    });
  }
});

function createQueueStub(queueName: string): Queue {
  const failedJob = {
    toJSON: () => ({
      id: '11111111-2222-3333-4444-555555555555',
      name: 'process-document',
      timestamp: 1_700_000_000_000,
      processedOn: 1_700_000_001_000,
      finishedOn: 1_700_000_002_000,
      attemptsMade: 2,
      progress: 75,
      failedReason:
        'OCR provider timed out for private/documents/confidential-contract.pdf',
      stacktrace: [
        'Error: OCR provider timed out for confidential-contract.pdf',
      ],
      opts: { attempts: 3 },
      data: {
        sourceId: '11111111-2222-3333-4444-555555555555',
        fileName: 'confidential-contract.pdf',
        minioPath: 'private/documents/confidential-contract.pdf',
        credentials: { token: 'never-display-this' },
      },
      returnvalue: { extractedText: 'private document contents' },
    }),
  };

  return Object.assign(Object.create(Queue.prototype), {
    name: queueName,
    qualifiedName: `bull:${queueName}`,
    opts: {},
    getJobCounts: jest.fn().mockResolvedValue({
      waiting: 1,
      active: 1,
      delayed: 1,
      completed: 1,
      failed: 1,
    }),
    isPaused: jest.fn().mockResolvedValue(false),
    getGlobalConcurrency: jest.fn().mockResolvedValue(null),
    getRateLimitTtl: jest.fn().mockResolvedValue(0),
    getJobSchedulersCount: jest.fn().mockResolvedValue(0),
    getWorkers: jest.fn().mockResolvedValue([{ addr: '127.0.0.1' }]),
    getJobs: jest
      .fn()
      .mockResolvedValue(
        queueName === 'document-processing' ? [failedJob] : [],
      ),
  }) as Queue;
}
