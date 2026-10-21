import {
  Controller,
  Headers,
  Post,
  Req,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import type { Request } from 'express';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import {
  IMAGE_UPLOAD_ADMISSION,
  IMAGE_UPLOAD_OPTIONS,
} from './image-upload.options';
import {
  IMAGE_UPLOAD_RETRY_AFTER_SECONDS,
  MAX_CONCURRENT_IMAGE_UPLOADS,
  MAX_IMAGES,
  MAX_IMAGE_SIZE_BYTES,
} from './image-upload.constants';

let finishAnswers: () => void;
let answers: Promise<void>;
let holdsReached: () => void;
let started: Promise<void>;
let holdTarget = 0;
let active = 0;

@Controller('upload-probe')
class UploadProbeController {
  @Post()
  @UseInterceptors(FilesInterceptor('images', MAX_IMAGES, IMAGE_UPLOAD_OPTIONS))
  async upload(
    @Headers('x-hold') hold: string | undefined,
    @Headers('x-release') release: string | undefined,
    @Req() request: Request,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    if (release === 'yes') IMAGE_UPLOAD_ADMISSION.release(request);
    if (hold === 'yes') {
      if (++active === holdTarget) holdsReached();
      await answers;
    }
    return { count: files.length };
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
      holdsReached = resolve;
    });
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
    options: { hold?: boolean; release?: boolean } = {},
  ) {
    return fetch(url, {
      method: 'POST',
      headers: {
        'x-hold': options.hold ? 'yes' : 'no',
        'x-release': options.release ? 'yes' : 'no',
      },
      body,
    });
  }

  function photo(bytes = new Uint8Array(1024), type = 'image/jpeg') {
    const body = new FormData();
    body.append('images', new Blob([bytes], { type }), 'photo');
    return body;
  }

  function textOnly() {
    const body = new FormData();
    body.append('text', 'Wie beantrage ich einen Pass?');
    return body;
  }

  async function holdAnswersOpen(count: number, release = false) {
    holdTarget = count;
    const ongoing = Array.from({ length: count }, () =>
      send(photo(), { hold: true, release }),
    );
    await started;
    return ongoing;
  }

  it('accepts a third image message while two other answers are still running', async () => {
    const ongoing = await holdAnswersOpen(2);
    try {
      expect((await send(photo())).status).toBe(201);
      expect((await send(textOnly())).status).toBe(201);
    } finally {
      finishAnswers();
      await Promise.all(ongoing);
    }
  });

  it('rejects another image message with 429 while the concurrent upload cap is held', async () => {
    const ongoing = await holdAnswersOpen(MAX_CONCURRENT_IMAGE_UPLOADS);
    try {
      const rejected = await send(photo());
      expect(rejected.status).toBe(429);
      expect(rejected.headers.get('retry-after')).toBe(
        String(IMAGE_UPLOAD_RETRY_AFTER_SECONDS),
      );
      expect(await rejected.json()).toMatchObject({
        code: 'IMAGE_UPLOADS_BUSY',
      });
      expect((await send(textOnly())).status).toBe(201);
    } finally {
      finishAnswers();
      await Promise.all(ongoing);
    }
    expect((await send(photo())).status).toBe(201);
  });

  it('frees the slot when the run releases its images before the answer ends', async () => {
    const ongoing = await holdAnswersOpen(MAX_CONCURRENT_IMAGE_UPLOADS, true);
    try {
      expect((await send(photo())).status).toBe(201);
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
      expect((await send(photo(new Uint8Array(size), type))).status).toBe(
        status,
      );
    },
  );

  it('returns 413 when aggregate bytes exceed 100 MiB', async () => {
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
