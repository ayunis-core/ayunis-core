import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EmailDeliveryStatus } from 'src/domain/artifacts/domain/email-delivery.entity';

export class EmailDeliveryResponseDto {
  @ApiProperty({ description: 'Unique identifier of the delivery' })
  id: string;

  @ApiProperty({ description: 'Email artifact identifier' })
  artifactId: string;

  @ApiProperty({ description: 'Version sent or being sent' })
  versionNumber: number;

  @ApiProperty({ enum: EmailDeliveryStatus })
  status: EmailDeliveryStatus;

  @ApiPropertyOptional({ type: String, nullable: true })
  sentAt: string | null;

  @ApiProperty()
  createdAt: string;
}
