import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Injectable,
  PayloadTooLargeException,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Injectable()
@Catch(PayloadTooLargeException)
export class PayloadTooLargeExceptionFilter implements ExceptionFilter {
  catch(exception: PayloadTooLargeException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    response.status(HttpStatus.PAYLOAD_TOO_LARGE).json({
      code: 'FILE_TOO_LARGE',
      message: exception.message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
