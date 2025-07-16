import { Module } from '@nestjs/common';
import { EmailHandlerPort } from './application/ports/email-handler.port';
import { SmptHandler } from './infrastructure/handlers/smpt.handler';
import { SendEmailUseCase } from './application/use-cases/send-email/send-email.use-case';

@Module({
  imports: [],
  controllers: [],
  providers: [
    {
      provide: EmailHandlerPort,
      useClass: SmptHandler,
    },
    SendEmailUseCase,
  ],
  exports: [SendEmailUseCase],
})
export class EmailsModule {}
