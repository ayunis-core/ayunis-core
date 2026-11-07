import { EventEmitter } from 'events';
import type { UUID } from 'crypto';
import type { Response } from 'express';
import type { RequestWithSubscriptionContext } from 'src/iam/authorization/application/guards/subscription.guard';
import type { SendMessageUseCase } from 'src/domain/runs/application/use-cases/send-message/send-message.use-case';
import type { SendMessageRequestValidator } from 'src/domain/runs/presenters/http/validation/send-message-request.validator';
import type { RunEventResponseMapper } from 'src/domain/runs/presenters/http/mappers/run-event-response.mapper';
import { RunSsePresenter } from 'src/domain/runs/presenters/http/sse/run-sse.presenter';
import { IMAGE_UPLOAD_ADMISSION } from 'src/domain/runs/presenters/http/image-upload.options';
import { RunsController } from './runs.controller';

jest.mock('@appsignal/nodejs', () => ({ setNamespace: jest.fn() }));

const THREAD_ID = '6b2f4d8a-1c3e-4a5b-9d7f-0e2a4c6b8d1f' as UUID;
const USER_ID = '7c3a5e9b-2d4f-4b6c-8e0a-1f3b5d7c9e2a' as UUID;

class FakeSseResponse extends EventEmitter {
  closed = false;
  writableEnded = false;
  setHeader = jest.fn();
  flushHeaders = jest.fn();
  write = jest.fn();
  end = jest.fn(() => {
    this.writableEnded = true;
  });
}

describe('RunsController.sendMessage', () => {
  it('frees the upload budget when the run cannot even be set up', async () => {
    const response = new FakeSseResponse();
    const request = Object.assign(new EventEmitter(), {
      res: response,
    }) as unknown as RequestWithSubscriptionContext;
    const before = IMAGE_UPLOAD_ADMISSION.reservedBytes;
    expect(IMAGE_UPLOAD_ADMISSION.reserve(request, 4096)).toBe(true);
    const sendMessageUseCase = { execute: jest.fn() };
    const controller = new RunsController(
      sendMessageUseCase as unknown as SendMessageUseCase,
      { validate: jest.fn() } as unknown as SendMessageRequestValidator,
      new RunSsePresenter({
        toDto: jest.fn(),
        eventId: jest.fn(),
      } as unknown as RunEventResponseMapper),
    );
    // Not received through the upload storage, so building the run input fails.
    const unreadableUpload = {
      mimetype: 'image/jpeg',
    } as Express.Multer.File;

    await expect(
      controller.sendMessage(
        { threadId: THREAD_ID, text: 'Was zeigt das Foto?' },
        [unreadableUpload],
        USER_ID,
        request,
        response as unknown as Response,
      ),
    ).rejects.toThrow(TypeError);

    expect(sendMessageUseCase.execute).not.toHaveBeenCalled();
    expect(response.flushHeaders).not.toHaveBeenCalled();
    expect(IMAGE_UPLOAD_ADMISSION.reservedBytes).toBe(before);
  });
});
