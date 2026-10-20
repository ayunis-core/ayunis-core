import {
  isWebhookDeliveryDeferred,
  runWithDeferredWebhookDelivery,
} from './webhook-delivery-context';

it('restores the enclosing context after nested delivery work', () => {
  const outer = {},
    inner = {};
  expect(isWebhookDeliveryDeferred(outer)).toBe(false);
  runWithDeferredWebhookDelivery([outer], () => {
    expect(isWebhookDeliveryDeferred(outer)).toBe(true);
    runWithDeferredWebhookDelivery([inner], () => {
      expect(isWebhookDeliveryDeferred(inner)).toBe(true);
      expect(isWebhookDeliveryDeferred(outer)).toBe(true);
    });
    expect(isWebhookDeliveryDeferred(outer)).toBe(true);
    expect(isWebhookDeliveryDeferred(inner)).toBe(false);
  });
  expect(isWebhookDeliveryDeferred(outer)).toBe(false);
});
it('isolates concurrent asynchronous event flows', async () => {
  const first = {},
    second = {};
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await Promise.all([
    runWithDeferredWebhookDelivery([first], async () => {
      await gate;
      expect(isWebhookDeliveryDeferred(first)).toBe(true);
      expect(isWebhookDeliveryDeferred(second)).toBe(false);
    }),
    runWithDeferredWebhookDelivery([second], async () => {
      expect(isWebhookDeliveryDeferred(first)).toBe(false);
      expect(isWebhookDeliveryDeferred(second)).toBe(true);
      release();
    }),
  ]);
});
