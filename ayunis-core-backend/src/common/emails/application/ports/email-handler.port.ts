import { Email } from '../../domain/email.entity';

export abstract class EmailHandlerPort {
  abstract sendEmail(email: Email): Promise<void>;
}
