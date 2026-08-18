import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { UUID } from 'crypto';
import { LessThan, Repository } from 'typeorm';
import { EmailDeliveryRepository } from '../../../application/ports/email-delivery.repository.port';
import {
  EmailDelivery,
  EmailDeliveryStatus,
} from '../../../domain/email-delivery.entity';
import { EmailDeliveryMapper } from './mappers/email-delivery.mapper';
import { EmailDeliveryRecord } from './schema/email-delivery.record';
import { isUniqueConstraintViolation } from './unique-constraint.util';

@Injectable()
export class LocalEmailDeliveryRepository extends EmailDeliveryRepository {
  constructor(
    @InjectRepository(EmailDeliveryRecord)
    private readonly repository: Repository<EmailDeliveryRecord>,
    private readonly mapper: EmailDeliveryMapper,
  ) {
    super();
  }

  async findByArtifactVersion(
    artifactId: UUID,
    versionNumber: number,
  ): Promise<EmailDelivery | null> {
    const record = await this.repository.findOne({
      where: { artifactId, versionNumber },
    });
    return record ? this.mapper.toDomain(record) : null;
  }

  async create(delivery: EmailDelivery): Promise<EmailDelivery> {
    try {
      const record = await this.repository.save(this.mapper.toRecord(delivery));
      return this.mapper.toDomain(record);
    } catch (error: unknown) {
      if (!isUniqueConstraintViolation(error)) throw error;

      const existing = await this.findByArtifactVersion(
        delivery.artifactId,
        delivery.versionNumber,
      );
      if (!existing) throw error;
      return existing;
    }
  }

  async claimForDelivery(
    deliveryId: UUID,
    staleBefore: Date,
  ): Promise<boolean> {
    const result = await this.repository.update(
      [
        { id: deliveryId, status: EmailDeliveryStatus.FAILED },
        {
          id: deliveryId,
          status: EmailDeliveryStatus.PENDING,
          updatedAt: LessThan(staleBefore),
        },
      ],
      {
        status: EmailDeliveryStatus.PENDING,
        errorMessage: null,
        sentAt: null,
        updatedAt: new Date(),
      },
    );
    return result.affected === 1;
  }

  async markSent(deliveryId: UUID, sentAt: Date): Promise<void> {
    await this.repository.update(deliveryId, {
      status: EmailDeliveryStatus.SENT,
      sentAt,
      errorMessage: null,
      updatedAt: sentAt,
    });
  }

  async markFailed(deliveryId: UUID, errorMessage: string): Promise<void> {
    await this.repository.update(deliveryId, {
      status: EmailDeliveryStatus.FAILED,
      errorMessage,
      updatedAt: new Date(),
    });
  }
}
