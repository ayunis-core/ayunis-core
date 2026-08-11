import { handleCliError } from 'src/cli/cli-error-handler';

describe('handleCliError', () => {
  const previousExitCode = process.exitCode;

  afterEach(() => {
    process.exitCode = previousExitCode;
    jest.restoreAllMocks();
  });

  it('writes a concise error and marks the process as failed', () => {
    const write = jest.spyOn(process.stderr, 'write').mockImplementation();

    handleCliError(new Error('configuration conflict'));

    expect(write).toHaveBeenCalledWith('Error: configuration conflict\n');
    expect(process.exitCode).toBe(1);
  });
});
