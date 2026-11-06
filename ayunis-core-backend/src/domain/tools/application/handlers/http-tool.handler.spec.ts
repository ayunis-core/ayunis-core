import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { randomUUID } from 'crypto';
import { createLoggerMock } from 'src/common/testing/logger.mock';
import {
  HttpTool,
  HttpToolConfig,
  HttpToolMethod,
} from 'src/domain/tools/domain/tools/http-tool.entity';
import { HttpToolHandler } from './http-tool.handler';

describe('HttpToolHandler', () => {
  let server: Server;
  let endpointUrl: string;
  let requestClosedEarly: Promise<boolean>;

  beforeEach(async () => {
    createLoggerMock();
    let reportClosed!: (closedEarly: boolean) => void;
    requestClosedEarly = new Promise((resolve) => (reportClosed = resolve));
    // Holds every request open so only the caller's abort can end it.
    server = createServer((req, res) => {
      res.on('close', () => reportClosed(!res.writableEnded));
    });
    await new Promise<void>((resolve) => server.listen(0, resolve));
    endpointUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/permits`;
  });

  afterEach(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  });

  const permitLookupTool = () =>
    new HttpTool(
      new HttpToolConfig({
        displayName: 'Permit lookup',
        description: 'Looks up building permits',
        userId: randomUUID(),
        method: HttpToolMethod.GET,
        endpointUrl,
      }),
    );

  it('aborts the outgoing request when the run is cancelled', async () => {
    const controller = new AbortController();
    const handler = new HttpToolHandler();

    const result = handler.execute({
      tool: permitLookupTool(),
      input: { bodyOrQueryParams: '{"district":"Trier-Nord"}' },
      context: {
        orgId: randomUUID(),
        threadId: randomUUID(),
        signal: controller.signal,
      },
    });
    await new Promise((resolve) => server.once('request', resolve));
    controller.abort(new Error('Run consumer abandoned the stream'));

    await expect(result).rejects.toBe(controller.signal.reason);
    await expect(requestClosedEarly).resolves.toBe(true);
  });
});
