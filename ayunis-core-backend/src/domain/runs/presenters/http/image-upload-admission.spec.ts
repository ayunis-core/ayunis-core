import { EventEmitter } from 'node:events';
import type { Request } from 'express';
import { ImageUploadAdmission } from './image-upload-admission';

function request(): Request {
  return { res: new EventEmitter() } as unknown as Request;
}

function closeResponse(req: Request): void {
  (req.res as unknown as EventEmitter).emit('close');
}

it('admits up to the cap with one slot per request', () => {
  const admission = new ImageUploadAdmission(2);
  const first = request();
  expect(admission.admit(first)).toBe(true);
  expect(admission.admit(first)).toBe(true);
  expect(admission.admit(request())).toBe(true);
  expect(admission.admit(request())).toBe(false);
  expect(admission.inFlight).toBe(2);
});

it('frees a slot once, on explicit release or when the response closes', () => {
  const admission = new ImageUploadAdmission(1);
  const first = request();
  admission.admit(first);
  admission.release(first);
  admission.release(first);
  closeResponse(first);
  expect(admission.inFlight).toBe(0);

  const second = request();
  expect(admission.admit(second)).toBe(true);
  closeResponse(second);
  expect(admission.inFlight).toBe(0);

  admission.release(request());
  expect(admission.inFlight).toBe(0);
});
