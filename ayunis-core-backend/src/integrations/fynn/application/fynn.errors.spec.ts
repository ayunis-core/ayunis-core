import { UnexpectedFynnSyncError } from './fynn.errors';

describe('Unexpected Fynn synchronization errors', () => {
  it('retains the failure for server diagnostics while hiding it from clients', () => {
    const cause = new Error('persistence failed');
    const error = new UnexpectedFynnSyncError(cause);
    expect(error.metadata).toEqual({ error: cause });
    expect(error.toClientResponse()).toEqual({
      code: 'UNEXPECTED_FYNN_SYNC_ERROR',
      message: 'Internal server error',
    });
  });
});
