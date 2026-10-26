import { EventEmitter } from 'node:events';
import type { Request } from 'express';
import { ImageUploadAdmission } from './image-upload-admission';

const BUDGET = 100;

function request(): Request {
  return {
    destroyed: false,
    res: Object.assign(new EventEmitter(), { closed: false }),
  } as unknown as Request;
}

function closeResponse(req: Request): void {
  const res = req.res as unknown as EventEmitter & { closed: boolean };
  res.closed = true;
  res.emit('close');
}

it('charges each retained chunk against the budget and refuses the one that would exceed it', () => {
  const admission = new ImageUploadAdmission(BUDGET);
  const first = request();
  expect(admission.reserve(first, 30)).toBe(true);
  expect(admission.reserve(first, 30)).toBe(true);
  expect(admission.reservedBytes).toBe(60);
  const second = request();
  expect(admission.reserve(second, 30)).toBe(true);
  expect(admission.reserve(second, 20)).toBe(false);
  expect(admission.reservedBytes).toBe(90);
  expect(admission.reserve(request(), 10)).toBe(true);
  expect(admission.reservedBytes).toBe(100);
});

it('frees everything a request retained on response close only until the handler takes ownership', () => {
  const admission = new ImageUploadAdmission(BUDGET);
  const rejectedBeforeHandler = request();
  admission.reserve(rejectedBeforeHandler, 25);
  admission.reserve(rejectedBeforeHandler, 15);
  closeResponse(rejectedBeforeHandler);
  expect(admission.reservedBytes).toBe(0);

  const owned = request();
  admission.reserve(owned, 40);
  const release = admission.transfer(owned);
  closeResponse(owned);
  expect(admission.reservedBytes).toBe(40);
  release();
  release();
  expect(admission.reservedBytes).toBe(0);
});

it('charges again what a close freed when the handler takes ownership afterwards', () => {
  const admission = new ImageUploadAdmission(BUDGET);
  const closedBeforeHandler = request();
  admission.reserve(closedBeforeHandler, 30);
  closeResponse(closedBeforeHandler);
  expect(admission.reservedBytes).toBe(0);
  const release = admission.transfer(closedBeforeHandler);
  expect(admission.reservedBytes).toBe(30);
  release();
  expect(admission.reservedBytes).toBe(0);
});

it('refuses bytes that arrive after the request was released or closed', () => {
  const admission = new ImageUploadAdmission(BUDGET);
  const aborted = request();
  admission.reserve(aborted, 30);
  closeResponse(aborted);
  expect(admission.reserve(aborted, 10)).toBe(false);
  expect(admission.reservedBytes).toBe(0);

  const closedBeforeFirstChunk = request();
  closeResponse(closedBeforeFirstChunk);
  expect(admission.reserve(closedBeforeFirstChunk, 10)).toBe(false);
  expect(admission.reservedBytes).toBe(0);
});

it('still charges a request whose body ended before its first chunk was delivered', () => {
  const admission = new ImageUploadAdmission(BUDGET);
  const ended = request();
  (ended as { destroyed: boolean }).destroyed = true;
  expect(admission.reserve(ended, 10)).toBe(true);
  expect(admission.reservedBytes).toBe(10);
});

it('hands a no-op release to a request that retained nothing', () => {
  const admission = new ImageUploadAdmission(BUDGET);
  admission.transfer(request())();
  expect(admission.reservedBytes).toBe(0);
  expect(admission.reserve(request(), BUDGET)).toBe(true);
});
