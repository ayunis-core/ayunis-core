import type { EmailDeliveryReceipt } from 'src/common/emails/application/models/email-delivery-receipt';
import type { Email } from 'src/common/emails/domain/email.entity';

export abstract class EmailHandlerPort {
  abstract sendEmail(email: Email): Promise<EmailDeliveryReceipt>;
}
