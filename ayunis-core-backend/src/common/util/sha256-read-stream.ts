import { createHash } from 'crypto';
import { createReadStream } from 'fs';
import { pipeline, Transform } from 'stream';

export interface Sha256ReadStream {
  stream: Transform;
  /** Hex digest of everything that passed through; valid once the consumer drained the stream. */
  digest(): string;
}

/**
 * Reads a file once, hashing the bytes on their way to the consumer, so a
 * staged upload needs neither a second pass over the file nor a heap copy.
 * A read error destroys the returned stream, which is where the consumer
 * sees it.
 */
export function createSha256ReadStream(path: string): Sha256ReadStream {
  const hash = createHash('sha256');
  const hashing = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      hash.update(chunk);
      callback(null, chunk);
    },
  });
  pipeline(createReadStream(path), hashing, () => undefined);
  return { stream: hashing, digest: () => hash.digest('hex') };
}
