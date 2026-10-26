import {
  Controller,
  Headers,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import { setFlagsFromString } from 'node:v8';
import { runInNewContext } from 'node:vm';
import { RunUserInput } from 'src/domain/runs/domain/run-input.entity';
import { IMAGE_UPLOAD_OPTIONS } from './image-upload.options';
import { MAX_IMAGES, MAX_IMAGE_SIZE_BYTES } from './image-upload.constants';
import { RunInputMapper } from './mappers/run-input.mapper';

setFlagsFromString('--expose-gc');
const collectGarbage = runInNewContext('gc') as () => void;

let finishAnswers: () => void;
let answers: Promise<void>;
let twoStarted: () => void;
let started: Promise<void>;
let active = 0;
let transferred: () => void;
let transferDone: Promise<void>;
let uploadBytes: WeakRef<Buffer> | undefined;

@Controller('upload-probe')
class UploadProbeController {
  @Post()
  @UseInterceptors(FilesInterceptor('images', MAX_IMAGES, IMAGE_UPLOAD_OPTIONS))
  async upload(
    @Headers('x-hold') hold: string | undefined,
    @Headers('x-transfer') transfer: string | undefined,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    if (transfer === 'yes') {
      this.transferAndRelease(files);
      transferred();
      await answers;
    }
    if (hold === 'yes') {
      if (++active === 2) twoStarted();
      await answers;
    }
    return { count: files.length };
  }

  // What the run does: take the bytes, persist, release them before the
  // answer streams. The response stays open meanwhile, as an SSE answer would.
  private transferAndRelease(files: Express.Multer.File[]): void {
    const input = RunInputMapper.toCommand(
      { threadId: randomUUID() },
      files,
    ) as RunUserInput;
    uploadBytes = new WeakRef(input.pendingImages[0].buffer);
    input.releaseImages();
  }
}

describe('chat image multipart uploads', () => {
  let app: INestApplication;
  let url: string;
  beforeEach(async () => {
    active = 0;
    answers = new Promise<void>((resolve) => {
      finishAnswers = resolve;
    });
    started = new Promise<void>((resolve) => {
      twoStarted = resolve;
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
    await app.close();
  });

  function send(
    body: FormData,
    options: { hold?: boolean; transfer?: boolean } = {},
  ) {
    return fetch(url, {
      method: 'POST',
      headers: {
        'x-hold': options.hold ? 'yes' : 'no',
        'x-transfer': options.transfer ? 'yes' : 'no',
      },
      body,
    });
  }

  async function settleAndCollect() {
    for (let round = 0; round < 3; round++) {
      await new Promise<void>((resolve) => setImmediate(resolve));
      collectGarbage();
    }
  }

  function photo(bytes = new Uint8Array(1024), type = 'image/jpeg') {
    const body = new FormData();
    body.append('images', new Blob([bytes], { type }), 'photo');
    return body;
  }

  it('accepts a third image message while two other answers are still running', async () => {
    const ongoing = [
      send(photo(), { hold: true }),
      send(photo(), { hold: true }),
    ];
    try {
      await started;
      expect((await send(photo())).status).toBe(201);
      const text = new FormData();
      text.append('text', 'Wie beantrage ich einen Pass?');
      expect((await send(text)).status).toBe(201);
    } finally {
      finishAnswers();
      await Promise.all(ongoing);
    }
  });

  it('lets released upload bytes be collected while the answer is still open', async () => {
    const ongoing = send(photo(new Uint8Array(256 * 1024)), {
      transfer: true,
    });
    try {
      await transferDone;
      await settleAndCollect();
      expect(uploadBytes).toBeDefined();
      expect(uploadBytes?.deref()).toBeUndefined();
    } finally {
      finishAnswers();
      await ongoing;
    }
  });

  it.each([
    [MAX_IMAGE_SIZE_BYTES + 1, 'image/jpeg', 413],
    [1, 'application/pdf', 400],
  ] as const)(
    'rejects an invalid file (%s bytes, %s)',
    async (size, type, status) => {
      expect((await send(photo(new Uint8Array(size), type))).status).toBe(
        status,
      );
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
    expect((await send(body)).status).toBe(413);
    expect((await send(photo())).status).toBe(201);
  });
});
