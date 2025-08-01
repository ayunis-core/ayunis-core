import { IsBoolean, IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';

export class UpdateModelDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(ModelProvider)
  @IsNotEmpty()
  provider: ModelProvider;

  @IsString()
  @IsNotEmpty()
  displayName: string;

  @IsBoolean()
  canStream: boolean;

  @IsBoolean()
  isReasoning: boolean;

  @IsBoolean()
  isArchived: boolean;
}
