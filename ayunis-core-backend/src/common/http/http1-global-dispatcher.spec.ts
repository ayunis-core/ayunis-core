import { execFile } from 'node:child_process';
import { once } from 'node:events';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { promisify } from 'node:util';

// Jest's sandbox has its own globalThis while the built-in fetch reads the
// dispatcher from the real one, so only a separate process shows production
// behavior.
const CHILD_SCRIPT = `
const { installHttp1GlobalDispatcher } = require('./src/common/http/http1-global-dispatcher');
const agent = installHttp1GlobalDispatcher();
let dispatched = 0;
const dispatch = agent.dispatch.bind(agent);
agent.dispatch = (...args) => (dispatched++, dispatch(...args));
fetch(process.env.TARGET_URL)
  .then((response) => response.text())
  .then((body) => console.log(JSON.stringify({ body, dispatched })))
  .finally(() => agent.close());
`;

describe('installHttp1GlobalDispatcher', () => {
  let server: Server;

  beforeEach(async () => {
    server = createServer((req, res) => res.end(`HTTP/${req.httpVersion}`));
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('routes the built-in fetch through the installed agent', async () => {
    const { stdout } = await promisify(execFile)(
      process.execPath,
      ['-r', 'ts-node/register/transpile-only', '-e', CHILD_SCRIPT],
      {
        cwd: `${__dirname}/../../..`,
        env: {
          ...process.env,
          NODE_OPTIONS: '',
          TARGET_URL: `http://127.0.0.1:${(server.address() as AddressInfo).port}/`,
        },
      },
    );

    expect(JSON.parse(stdout)).toEqual({ body: 'HTTP/1.1', dispatched: 1 });
  }, 30_000);
});
