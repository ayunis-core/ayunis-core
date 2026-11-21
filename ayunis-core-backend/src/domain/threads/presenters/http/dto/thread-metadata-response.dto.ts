import { ApiExtraModels, ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { ModelMode } from 'src/domain/models/domain/value-objects/model-mode.enum';
import {
  ChatThreadOriginResponseDto,
  NotificationThreadOriginResponseDto,
  ReleaseNoteThreadOriginResponseDto,
  OnboardingThreadOriginResponseDto,
  FeatureGuideThreadOriginResponseDto,
  RoutineThreadOriginResponseDto,
  type ThreadOriginResponseDto,
} from 'src/domain/threads/presenters/http/dto/thread-origin-response.dto';

/**
 * Thread fields that both the list and the single-thread response carry.
 * Shared through inheritance so the two DTOs cannot drift apart.
 */
@ApiExtraModels(
  ChatThreadOriginResponseDto,
  RoutineThreadOriginResponseDto,
  NotificationThreadOriginResponseDto,
  ReleaseNoteThreadOriginResponseDto,
  OnboardingThreadOriginResponseDto,
  FeatureGuideThreadOriginResponseDto,
)
export class ThreadMetadataResponseDto {
  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-01-01T12:00:00.000Z',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-01-01T12:30:00.000Z',
  })
  updatedAt: string;

  @ApiProperty({
    description:
      'Whether the thread is in anonymous mode (PII redaction enabled)',
    example: false,
  })
  isAnonymous: boolean;

  @ApiProperty({
    enum: ModelMode,
    enumName: 'ModelMode',
    nullable: true,
    description:
      'Mode the chat was started with; null when an individual model was chosen',
  })
  mode: ModelMode | null;

  @ApiProperty({
    type: String,
    description: 'The workspace this thread is filed under, if any',
    example: '123e4567-e89b-12d3-a456-426614174000',
    nullable: true,
  })
  workspaceId: string | null;

  @ApiProperty({
    description:
      'Why the thread exists: a chat a user started, a routine run, a chat about a notification or a release note, an onboarding chat, or a chat explaining a feature',
    oneOf: [
      { $ref: getSchemaPath(ChatThreadOriginResponseDto) },
      { $ref: getSchemaPath(RoutineThreadOriginResponseDto) },
      { $ref: getSchemaPath(NotificationThreadOriginResponseDto) },
      { $ref: getSchemaPath(ReleaseNoteThreadOriginResponseDto) },
      { $ref: getSchemaPath(OnboardingThreadOriginResponseDto) },
      { $ref: getSchemaPath(FeatureGuideThreadOriginResponseDto) },
    ],
    discriminator: { propertyName: 'kind' },
  })
  origin: ThreadOriginResponseDto;
}
