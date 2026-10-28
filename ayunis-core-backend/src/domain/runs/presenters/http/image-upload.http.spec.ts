import {
  Controller,
  Headers,
  Injectable,
  Post,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type { CanActivate } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { connect, type Socket } from 'node:net';
import { setFlagsFromString } from 'node:v8';
import { runInNewContext } from 'node:vm';
import type { Request } from 'express';
import { RunUserInput } from 'src/domain/runs/domain/run-input.entity';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import {
  IMAGE_UPLOAD_ADMISSION,
  IMAGE_UPLOAD_OPTIONS,
} from './image-upload.options';
import { ImageUploadAdmission } from './image-upload-admission';
import { TotalSizeLimitedMemoryStorage } from './total-size-limited-memory.storage';
import {
  IMAGE_UPLOAD_RETRY_AFTER_SECONDS,
  MAX_IMAGES,
  MAX_IMAGE_SIZE_BYTES,
  MAX_TOTAL_SIZE_BYTES,
} from './image-upload.constants';
import { RunInputMapper } from './mappers/run-input.mapper';

setFlagsFromString('--expose-gc');
const collectGarbage = runInNewContext('gc') as () => void;

// Two large photos fit the probe's budget, a third does not; small photos
// keep fitting alongside them.
const LARGE_PHOTO_BYTES = 64 * 1024;
const PROBE_BUDGET_BYTES = Math.floor(2.5 * LARGE_PHOTO_BYTES);
const admission = new ImageUploadAdmission(PROBE_BUDGET_BYTES);
const PROBE_UPLOAD_OPTIONS = {
  ...IMAGE_UPLOAD_OPTIONS,
  storage: new TotalSizeLimitedMemoryStorage(MAX_TOTAL_SIZE_BYTES, admission),
};

let finishAnswers: () => void;
let answers: Promise<void>;
let holdsReached: () => void;
let started: Promise<void>;
let holdTarget = 0;
let active = 0;
let detachedRelease: (() => void) | undefined;
let transferred: () => void;
let transferDone: Promise<void>;
let uploadBytes: WeakRef<Buffer> | undefined;

// The production route runs async guards (JWT, subscription) before Multer
// attaches; by then a small body has been fully received and its request
// stream destroyed, so the file chunk reaches the storage engine afterwards.
@Injectable()
class DeferringGuard implements CanActivate {
  async canActivate(): Promise<boolean> {
    await new Promise<void>((resolve) => setImmediate(resolve));
    return true;
  }
}

@Controller('upload-probe')
@UseGuards(DeferringGuard)
class UploadProbeController {
  @Post()
  @UseInterceptors(FilesInterceptor('images', MAX_IMAGES, PROBE_UPLOAD_OPTIONS))
  async upload(
    @Headers('x-hold') hold: string | undefined,
    @Headers('x-release') release: string | undefined,
    @Headers('x-detach') detach: string | undefined,
    @Headers('x-transfer') transfer: string | undefined,
    @Req() request: Request,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const releaseUploads = admission.transfer(request);
    // A run that still holds the originals after the client disconnected.
    if (detach === 'yes') {
      detachedRelease = releaseUploads;
      return { count: files.length };
    }
    try {
      if (transfer === 'yes') {
        this.transferAndRelease(files, releaseUploads);
        transferred();
        await answers;
      }
      if (release === 'yes') releaseUploads();
      if (hold === 'yes') {
        if (++active === holdTarget) holdsReached();
        await answers;
      }
      return { count: files.length };
    } finally {
      releaseUploads();
    }
  }

  // What the run does: take the bytes, persist, release them before the
  // answer streams. The response stays open meanwhile, as an SSE answer would.
  private transferAndRelease(
    files: Express.Multer.File[],
    releaseUploads: () => void,
  ): void {
    const input = RunInputMapper.toCommand(
      { threadId: randomUUID() },
      files,
      undefined,
      releaseUploads,
    ) as RunUserInput;
    uploadBytes = new WeakRef(input.pendingImages[0].buffer);
    input.releaseImages();
  }

  @Post('production-limits')
  @UseInterceptors(FilesInterceptor('images', MAX_IMAGES, IMAGE_UPLOAD_OPTIONS))
  uploadWithProductionLimits(
    @Req() request: Request,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    IMAGE_UPLOAD_ADMISSION.transfer(request)();
    return { count: files.length };
  }
}

describe('chat image multipart uploads', () => {
  let app: INestApplication;
  let url: string;
  beforeEach(async () => {
    active = 0;
    detachedRelease = undefined;
    answers = new Promise<void>((resolve) => {
      finishAnswers = resolve;
    });
    started = new Promise<void>((resolve) => {
      holdsReached = resolve;
    });
    transferDone = new Promise<void>((resolve) => {
      transferred = resolve;
    });
    uploadBytes = undefined;
    const module = await Test.createTestingModule({
      controllers: [UploadProbeController],
    }).compile();
    app = module.createNestApplication({ logger: false });
    await app.listen(0, '127.0.0.1');
    url = `${await app.getUrl()}/upload-probe`;
  });
  afterEach(async () => {
    finishAnswers();
    detachedRelease?.();
    await app.close();
  });

  function send(
    body: FormData,
    options: {
      hold?: boolean;
      release?: boolean;
      detach?: boolean;
      transfer?: boolean;
      productionLimits?: boolean;
    } = {},
  ) {
    return fetch(options.productionLimits ? `${url}/production-limits` : url, {
      method: 'POST',
      headers: probeHeaders(options),
      body,
    });
  }

  function probeHeaders(options: {
    hold?: boolean;
    release?: boolean;
    detach?: boolean;
    transfer?: boolean;
  }) {
    return {
      'x-hold': options.hold ? 'yes' : 'no',
      'x-release': options.release ? 'yes' : 'no',
      'x-detach': options.detach ? 'yes' : 'no',
      'x-transfer': options.transfer ? 'yes' : 'no',
    };
  }

  async function settleAndCollect() {
    for (let round = 0; round < 3; round++) {
      await new Promise<void>((resolve) => setImmediate(resolve));
      collectGarbage();
    }
  }

  // Streams the multipart body with Transfer-Encoding: chunked, so the
  // request carries no Content-Length.
  async function sendChunked(body: FormData) {
    const encoded = new Response(body);
    const bytes = new Uint8Array(await encoded.arrayBuffer());
    return fetch(url, {
      method: 'POST',
      headers: {
        ...probeHeaders({}),
        'content-type': encoded.headers.get('content-type')!,
      },
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(bytes);
          controller.close();
        },
      }),
      duplex: 'half',
    } as RequestInit);
  }

  // Opens a multipart request that declares `declaredLength`, delivers the
  // first file part's headers plus a few bytes of its body, then stops.
  async function stallUpload(declaredLength: number): Promise<Socket> {
    const { port } = new URL(url);
    const socket = connect(Number(port), '127.0.0.1');
    await once(socket, 'connect');
    const boundary = 'stall-boundary';
    socket.write(
      [
        'POST /upload-probe HTTP/1.1',
        'Host: 127.0.0.1',
        `Content-Type: multipart/form-data; boundary=${boundary}`,
        `Content-Length: ${declaredLength}`,
        'x-hold: no',
        'x-release: no',
        'x-detach: no',
        '',
        `--${boundary}`,
        'Content-Disposition: form-data; name="images"; filename="photo"',
        'Content-Type: image/jpeg',
        '',
        'partial-bytes',
      ].join('\r\n'),
    );
    await new Promise<void>((resolve) => setTimeout(resolve, 100));
    return socket;
  }

  // Delivers headers and the whole body in one packet, as a browser does for
  // a small photo, so the request has ended before Multer emits its chunk.
  async function sendInOnePacket(body: FormData): Promise<number> {
    const encoded = new Response(body);
    const bytes = Buffer.from(await encoded.arrayBuffer());
    const { port } = new URL(url);
    const socket = connect(Number(port), '127.0.0.1');
    await once(socket, 'connect');
    socket.write(
      Buffer.concat([
        Buffer.from(
          [
            'POST /upload-probe HTTP/1.1',
            'Host: 127.0.0.1',
            `Content-Type: ${encoded.headers.get('content-type')!}`,
            `Content-Length: ${bytes.length}`,
            'Connection: close',
            'x-hold: no',
            'x-release: no',
            'x-detach: no',
            '',
            '',
          ].join('\r\n'),
        ),
        bytes,
      ]),
    );
    const [head] = (await once(socket, 'data')) as [Buffer];
    socket.destroy();
    return Number(head.toString().split(' ')[1]);
  }

  function photo(bytes = new Uint8Array(1024), type = 'image/jpeg') {
    const body = new FormData();
    body.append('images', new Blob([bytes], { type }), 'photo');
    return body;
  }

  function largePhoto() {
    return photo(new Uint8Array(LARGE_PHOTO_BYTES));
  }

  function textOnly() {
    const body = new FormData();
    body.append('text', 'Wie beantrage ich einen Pass?');
    return body;
  }

  async function holdAnswersOpen(count: number, release = false) {
    holdTarget = count;
    const ongoing = Array.from({ length: count }, () =>
      send(largePhoto(), { hold: true, release }),
    );
    await started;
    return ongoing;
  }

  it('keeps admitting normal photos while large uploads hold most of the budget', async () => {
    const ongoing = await holdAnswersOpen(2);
    try {
      for (let index = 0; index < 10; index++)
        expect((await send(photo())).status).toBe(201);
      expect((await send(textOnly())).status).toBe(201);
    } finally {
      finishAnswers();
      await Promise.all(ongoing);
    }
  });

  it('rejects an upload that would exceed the byte budget with 429 and admits a smaller one', async () => {
    const ongoing = await holdAnswersOpen(2);
    try {
      const rejected = await send(largePhoto());
      expect(rejected.status).toBe(429);
      expect(rejected.headers.get('retry-after')).toBe(
        String(IMAGE_UPLOAD_RETRY_AFTER_SECONDS),
      );
      expect(await rejected.json()).toMatchObject({
        code: 'IMAGE_UPLOADS_BUSY',
      });
      expect((await send(photo())).status).toBe(201);
      expect((await send(textOnly())).status).toBe(201);
    } finally {
      finishAnswers();
      await Promise.all(ongoing);
    }
    expect((await send(largePhoto())).status).toBe(201);
  });

  it('admits a small photo whose whole request arrived in one packet', async () => {
    expect(await sendInOnePacket(photo())).toBe(201);
    expect(admission.reservedBytes).toBe(0);
  });

  it('charges a chunked upload without Content-Length only for its bytes', async () => {
    expect((await sendChunked(largePhoto())).status).toBe(201);
    expect(admission.reservedBytes).toBe(0);
  });

  it('charges a stalled upload only for the bytes it sent, whatever its Content-Length declares', async () => {
    const stalled = await stallUpload(MAX_TOTAL_SIZE_BYTES);
    try {
      expect(admission.reservedBytes).toBeLessThan(1024);
      expect((await send(largePhoto())).status).toBe(201);
      expect((await send(largePhoto())).status).toBe(201);
    } finally {
      stalled.destroy();
    }
  });

  it('lets released upload bytes be collected while the answer is still open', async () => {
    const ongoing = send(largePhoto(), { transfer: true });
    try {
      await transferDone;
      await settleAndCollect();
      expect(uploadBytes).toBeDefined();
      expect(uploadBytes?.deref()).toBeUndefined();
      expect(admission.reservedBytes).toBe(0);
    } finally {
      finishAnswers();
      await ongoing;
    }
  });

  it('frees the reservation when the run releases its images before the answer ends', async () => {
    const ongoing = await holdAnswersOpen(2, true);
    try {
      expect((await send(largePhoto())).status).toBe(201);
    } finally {
      finishAnswers();
      await Promise.all(ongoing);
    }
  });

  it('keeps the reservation after the response closes until the run releases its images', async () => {
    const ongoing = await holdAnswersOpen(1);
    try {
      const detached = await send(largePhoto(), { detach: true });
      expect(detached.status).toBe(201);
      await detached.text();
      expect((await send(largePhoto())).status).toBe(429);
      detachedRelease?.();
      expect((await send(largePhoto())).status).toBe(201);
    } finally {
      finishAnswers();
      await Promise.all(ongoing);
    }
  });

  it.each([
    [MAX_IMAGE_SIZE_BYTES + 1, 'image/jpeg', 413],
    [1, 'application/pdf', 400],
  ] as const)(
    'rejects an invalid file (%s bytes, %s)',
    async (size, type, status) => {
      expect(
        (
          await send(photo(new Uint8Array(size), type), {
            productionLimits: true,
          })
        ).status,
      ).toBe(status);
    },
  );

  it('returns 413 when aggregate bytes exceed 80 MiB', async () => {
    const body = new FormData();
    const image = new Blob([new Uint8Array(MAX_IMAGE_SIZE_BYTES)], {
      type: 'image/jpeg',
    });
    for (let index = 0; index < 4; index++)
      body.append('images', image, `${index}.jpg`);
    body.append(
      'images',
      new Blob(['x'], { type: 'image/jpeg' }),
      'overflow.jpg',
    );
    expect((await send(body, { productionLimits: true })).status).toBe(413);
    expect((await send(photo(), { productionLimits: true })).status).toBe(201);
  });
});
