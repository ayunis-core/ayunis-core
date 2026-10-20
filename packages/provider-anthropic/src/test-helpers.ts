/**
 * Serves a scripted event iterable as the SSE response `asResponse()`
 * resolves to. A thrown step errors the body with that same error, and
 * cancelling the body returns the iterator, as a dropped connection would.
 */
export const toSseResponse = (events: AsyncIterable<unknown>): Response => {
  const iterator = events[Symbol.asyncIterator]();
  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream<Uint8Array>({
      async pull(controller) {
        const next = await iterator.next();
        if (next.done) {
          controller.close();
          return;
        }
        const event = next.value as { type: string };
        controller.enqueue(
          encoder.encode(
            `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`,
          ),
        );
      },
      async cancel() {
        await iterator.return?.();
      },
    }),
  );
};

/** Wraps a `messages.create` result so it answers `asResponse()` like the SDK's APIPromise. */
export const asApiPromise = (
  result: Promise<AsyncIterable<unknown>> | AsyncIterable<unknown>,
) => ({
  asResponse: async () => toSseResponse(await result),
});

export const events = (...items: readonly unknown[]): AsyncIterable<unknown> =>
  ReadableStream.from(items);
