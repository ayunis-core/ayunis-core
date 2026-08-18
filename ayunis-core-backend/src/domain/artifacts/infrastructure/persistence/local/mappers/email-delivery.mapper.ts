import { Injectable } from '@nestjs/common';
import { EmailDelivery } from 'src/domain/artifacts/domain/email-delivery.entity';
import { EmailDeliveryRecord } from '../schema/email-delivery.record';

@Injectable()
export class EmailDeliveryMapper {
  toDomain(record: EmailDeliveryRecord): EmailDelivery {
    return new EmailDelivery({
      id: record.id,
      artifactId: record.artifactId,
      versionNumber: record.versionNumber,
      status: record.status,
      errorMessage: record.errorMessage,
      sentAt: record.sentAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  toRecord(domain: EmailDelivery): EmailDeliveryRecord {
    const record = new EmailDeliveryRecord();
    record.id = domain.id;
    record.artifactId = domain.artifactId;
    record.versionNumber = domain.versionNumber;
    record.status = domain.status;
    record.errorMessage = domain.errorMessage;
    record.sentAt = domain.sentAt;
    return record;
  }
}
