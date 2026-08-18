import type { UUID } from 'crypto';
import type { EmailDelivery } from '../../domain/email-delivery.entity';

export abstract class EmailDeliveryRepository {
  abstract findByArtifactVersion(
    artifactId: UUID,
    versionNumber: number,
  ): Promise<EmailDelivery | null>;

  abstract create(delivery: EmailDelivery): Promise<EmailDelivery>;

  abstract claimForDelivery(
    deliveryId: UUID,
    staleBefore: Date,
  ): Promise<boolean>;

  abstract markSent(deliveryId: UUID, sentAt: Date): Promise<void>;

  abstract markFailed(deliveryId: UUID, errorMessage: string): Promise<void>;
}
