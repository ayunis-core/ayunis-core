import {
  ApiExtraModels,
  ApiPropertyOptional,
  getSchemaPath,
} from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsObject,
  IsOptional,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { ModelMode } from 'src/domain/models/domain/value-objects/model-mode.enum';
import { UUID } from 'crypto';
import { ThreadOriginKind } from 'src/domain/threads/domain/thread-origin';
import {
  NotificationThreadOriginDto,
  ReleaseNoteThreadOriginDto,
  OnboardingThreadOriginDto,
  UnsupportedThreadOriginDto,
  type CreateThreadOriginDto,
} from 'src/domain/threads/presenters/http/dto/create-thread-origin.dto';

@ApiExtraModels(
  NotificationThreadOriginDto,
  ReleaseNoteThreadOriginDto,
  OnboardingThreadOriginDto,
)
export class CreateThreadDto {
  @ApiPropertyOptional({
    description: 'The id of the model',
    example: '123e4567-e89b-12d3-a456-426614174000',
    type: 'string',
    format: 'uuid',
  })
  @IsUUID()
  @IsOptional()
  modelId?: UUID;

  @ApiPropertyOptional({
    description:
      'Start the chat in a mode instead of with a specific model; mutually exclusive with modelId',
    enum: ModelMode,
    enumName: 'ModelMode',
  })
  @IsEnum(ModelMode)
  @IsOptional()
  mode?: ModelMode;

  @ApiPropertyOptional({
    description: 'Enable anonymous mode for this thread',
    example: false,
    default: false,
    type: 'boolean',
  })
  @IsBoolean()
  @IsOptional()
  isAnonymous?: boolean;

  @ApiPropertyOptional({
    description: 'File the new thread under this workspace',
    example: '123e4567-e89b-12d3-a456-426614174000',
    type: 'string',
    format: 'uuid',
  })
  @IsUUID()
  @IsOptional()
  workspaceId?: UUID;

  @ApiPropertyOptional({
    description:
      "Why the thread exists; a plain chat when omitted. Routine threads are only created by routine runs, and an onboarding stage is not checked against the user's current one.",
    oneOf: [
      { $ref: getSchemaPath(NotificationThreadOriginDto) },
      { $ref: getSchemaPath(ReleaseNoteThreadOriginDto) },
      { $ref: getSchemaPath(OnboardingThreadOriginDto) },
    ],
    discriminator: { propertyName: 'kind' },
  })
  @IsObject()
  @ValidateNested()
  @Type(() => UnsupportedThreadOriginDto, {
    discriminator: {
      property: 'kind',
      subTypes: [
        {
          value: NotificationThreadOriginDto,
          name: ThreadOriginKind.NOTIFICATION,
        },
        {
          value: ReleaseNoteThreadOriginDto,
          name: ThreadOriginKind.RELEASE_NOTE,
        },
        { value: OnboardingThreadOriginDto, name: ThreadOriginKind.ONBOARDING },
      ],
    },
    keepDiscriminatorProperty: true,
  })
  @IsOptional()
  origin?: CreateThreadOriginDto;
}
