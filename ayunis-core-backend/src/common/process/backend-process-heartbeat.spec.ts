import { checkIn } from '@appsignal/nodejs';
import { startBackendProcessHeartbeat } from './backend-process-heartbeat';

jest.mock('@appsignal/nodejs', () => ({
  checkIn: {
    heartbeat: jest.fn(),
  },
}));

describe('startBackendProcessHeartbeat', () => {
  it('starts the continuous backend process heartbeat', () => {
    startBackendProcessHeartbeat();

    expect(checkIn.heartbeat).toHaveBeenCalledWith('backend_process', {
      continuous: true,
    });
  });
});
