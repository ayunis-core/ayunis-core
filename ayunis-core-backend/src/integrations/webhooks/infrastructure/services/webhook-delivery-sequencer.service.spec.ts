import { WebhookDeliverySequencer } from './webhook-delivery-sequencer.service';

describe('WebhookDeliverySequencer', () => {
  it('drains work enqueued while shutdown is waiting', async () => {
    const sequencer = new WebhookDeliverySequencer();
    let finishFirst = (): void => undefined;
    let finishSecond = (): void => undefined;
    const firstDelivery = new Promise<void>((resolve) => {
      finishFirst = resolve;
    });
    const secondDelivery = new Promise<void>((resolve) => {
      finishSecond = resolve;
    });

    void sequencer.enqueue('org-1', () => firstDelivery);
    const shutdown = sequencer.onApplicationShutdown();
    let shutdownFinished = false;
    void shutdown.then(() => {
      shutdownFinished = true;
    });
    void sequencer.enqueue('org-1', () => secondDelivery);

    finishFirst();
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(shutdownFinished).toBe(false);

    finishSecond();
    await shutdown;
    expect(shutdownFinished).toBe(true);
  });
});
