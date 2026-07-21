import { createServer, type Server } from 'http';
import { connect, type Socket, type AddressInfo } from 'net';
import type { Response } from 'express';
import type { UUID } from 'crypto';
import type { RunEvent } from 'src/domain/runs/application/run-events';
import type { RunEventResponseMapper } from '../mappers/run-event-response.mapper';
import { RunSsePresenter } from './run-sse.presenter';

/**
 * Integration spec over real sockets: unlike the unit spec (which emits
 * events on a fake response), this drives the presenter through Node's real
 * http server and aborts the connection from a real TCP client — the
 * scenario where a crash here would kill the whole process (AYC-491).
 */

const THREAD_ID = 'f4b2e1d0-3c5a-4b7e-9d8f-1a2b3c4d5e6f' as UUID;
const EVENT_INTERVAL_MS = 20;
const MAX_EVENTS = 500;

const eventMapper = {
  toDto: (event: RunEvent) => ({ mapped: event.type }),
  eventId: (event: RunEvent) => `${event.type}-id`,
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface RunSourceProbe {
  events: () => AsyncGenerator<RunEvent>;
  wasCancelled: () => boolean;
  yieldedCount: () => number;
}

// A stand-in for the LLM event stream: yields steadily until cancelled.
// The finally block records whether the consumer released the generator —
// the guarantee that a disconnect actually stops the run pipeline.
function makeRunSource(): RunSourceProbe {
  let cancelled = false;
  let yielded = 0;
  async function* events(): AsyncGenerator<RunEvent> {
    try {
      for (let i = 0; i < MAX_EVENTS; i++) {
        yielded += 1;
        yield {
          type: 'session',
          streaming: true,
          threadId: THREAD_ID,
          timestamp: `t${i}`,
        };
        await sleep(EVENT_INTERVAL_MS);
      }
    } finally {
      cancelled = true;
    }
  }
  return {
    events,
    wasCancelled: () => cancelled,
    yieldedCount: () => yielded,
  };
}

function openClient(port: number): Socket {
  const socket = connect(port, '127.0.0.1');
  socket.on('connect', () => {
    socket.write('GET /stream HTTP/1.1\r\nHost: 127.0.0.1\r\n\r\n');
  });
  socket.on('error', () => {
    // The abort tests tear the socket down on purpose; a client-side
    // error after that must not fail the test run.
  });
  return socket;
}

function receiveBytes(socket: Socket, minBytes: number): Promise<string> {
  return new Promise((resolve, reject) => {
    let received = '';
    const timer = setTimeout(
      () => reject(new Error(`timed out waiting for ${minBytes} bytes`)),
      5_000,
    );
    socket.on('data', (chunk) => {
      received += chunk.toString();
      if (received.length >= minBytes) {
        clearTimeout(timer);
        resolve(received);
      }
    });
  });
}

describe('RunSsePresenter over real sockets', () => {
  jest.setTimeout(15_000);

  const presenter = new RunSsePresenter(
    eventMapper as unknown as RunEventResponseMapper,
  );

  let server: Server;
  let port: number;
  let openSockets: Socket[];
  let activeStreams: Promise<void>[];
  let activeSources: RunSourceProbe[];

  beforeEach(async () => {
    openSockets = [];
    activeStreams = [];
    activeSources = [];
    server = createServer((req, res) => {
      const source = makeRunSource();
      activeSources.push(source);
      activeStreams.push(
        presenter.stream(
          res as unknown as Response,
          THREAD_ID,
          source.events(),
        ),
      );
    });
    await new Promise<void>((resolve) =>
      server.listen(0, '127.0.0.1', resolve),
    );
    port = (server.address() as AddressInfo).port;
  });

  afterEach(async () => {
    for (const socket of openSockets) {
      socket.destroy();
    }
    await Promise.all(activeStreams);
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve())),
    );
  });

  const connectAndReceiveStream = async (): Promise<Socket> => {
    const socket = openClient(port);
    openSockets.push(socket);
    const preamble = await receiveBytes(socket, 400);
    expect(preamble).toContain(': connection established');
    expect(preamble).toContain('id: session-id');
    return socket;
  };

  it.each([
    ['polite FIN close', (socket: Socket) => socket.end()],
    ['hard TCP reset', (socket: Socket) => socket.resetAndDestroy()],
  ])(
    'stops the run and keeps serving when the client aborts mid-stream (%s)',
    async (_label, abort) => {
      const socket = await connectAndReceiveStream();

      abort(socket);

      // The stream promise resolving (not rejecting, not hanging until the
      // source is exhausted) is the survival guarantee.
      await activeStreams[0];

      const source = activeSources[0];
      expect(source.wasCancelled()).toBe(true);
      expect(source.yieldedCount()).toBeLessThan(MAX_EVENTS);

      // The server must still accept and stream to new clients.
      const nextClient = await connectAndReceiveStream();
      nextClient.end();
    },
  );

  it('streams to completion when the client stays connected', async () => {
    const shortLivedServer = createServer((req, res) => {
      const source = makeRunSource();
      activeSources.push(source);
      activeStreams.push(
        // Empty source completes immediately — the happy-path teardown.
        presenter.stream(
          res as unknown as Response,
          THREAD_ID,
          (async function* (): AsyncGenerator<RunEvent> {
            yield {
              type: 'session',
              streaming: true,
              threadId: THREAD_ID,
              timestamp: 't0',
            };
            await Promise.resolve();
          })(),
        ),
      );
    });
    await new Promise<void>((resolve) =>
      shortLivedServer.listen(0, '127.0.0.1', resolve),
    );
    const shortPort = (shortLivedServer.address() as AddressInfo).port;

    const socket = connect(shortPort, '127.0.0.1');
    openSockets.push(socket);
    socket.on('connect', () => {
      socket.write('GET /stream HTTP/1.1\r\nHost: 127.0.0.1\r\n\r\n');
    });
    const body = await new Promise<string>((resolve) => {
      let received = '';
      socket.on('data', (chunk) => {
        received += chunk.toString();
      });
      socket.on('end', () => resolve(received));
    });

    expect(body).toContain(': connection established');
    expect(body).toContain('id: session-id');
    await new Promise<void>((resolve, reject) =>
      shortLivedServer.close((err) => (err ? reject(err) : resolve())),
    );
  });
});
