import { StageStopwatch } from './stage-stopwatch';

type Stage = 'download' | 'extraction' | 'conversion';

describe('StageStopwatch', () => {
  it('measures each stage and reports rounded millisecond attributes', async () => {
    const stopwatch = new StageStopwatch<Stage>();
    const now = jest.spyOn(performance, 'now');
    now.mockReturnValueOnce(1000).mockReturnValueOnce(1012.5);
    await stopwatch.measure('download', async () => 'bytes');
    now.mockReturnValueOnce(2000).mockReturnValueOnce(2250.5);
    await stopwatch.measure('extraction', async () => 'text');

    expect(stopwatch.values()).toEqual({ download: 12.5, extraction: 250.5 });
    expect(stopwatch.report()).toEqual({ downloadMs: 13, extractionMs: 251 });
  });

  it('runs stages through the instrument and returns the stage result', async () => {
    const wrapped: string[] = [];
    const stopwatch = new StageStopwatch<Stage>((stage, run) => {
      wrapped.push(stage);
      return run();
    });

    await expect(
      stopwatch.measure('download', async () => Buffer.from('pdf')),
    ).resolves.toEqual(Buffer.from('pdf'));
    expect(wrapped).toEqual(['download']);
  });

  it('remembers the stage that threw and keeps its duration', async () => {
    const stopwatch = new StageStopwatch<Stage>();

    await expect(
      stopwatch.measure('extraction', async () => {
        throw new Error('OCR rejected the document');
      }),
    ).rejects.toThrow('OCR rejected the document');

    expect(stopwatch.failedStage).toBe('extraction');
    expect(stopwatch.values().extraction).toEqual(expect.any(Number));
  });

  it('lets a caller carve a sub-stage out of a measured stage', async () => {
    const stopwatch = new StageStopwatch<Stage>();
    const now = jest.spyOn(performance, 'now');
    now.mockReturnValueOnce(0).mockReturnValueOnce(500);
    await stopwatch.measure('extraction', async () => undefined);

    stopwatch.record('conversion', 120);
    stopwatch.record('extraction', stopwatch.get('extraction') - 120);

    expect(stopwatch.values()).toEqual({ extraction: 380, conversion: 120 });
  });

  it('reports the elapsed time since construction', () => {
    const now = jest.spyOn(performance, 'now');
    now.mockReturnValueOnce(100);
    const stopwatch = new StageStopwatch<Stage>();
    now.mockReturnValueOnce(1600);

    expect(stopwatch.elapsedMs()).toBe(1500);
  });
});
