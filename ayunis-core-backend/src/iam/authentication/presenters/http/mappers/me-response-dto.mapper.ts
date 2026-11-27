import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { featuresConfig } from 'src/config/features.config';
import { getTokenSurfaceScopes } from 'src/config/surface-registry';
import { ActiveUser } from 'src/iam/authentication/domain/active-user.entity';
import { MeResponseDto } from 'src/iam/authentication/presenters/http/dtos/auth-response.dto';

@Injectable()
export class MeResponseDtoMapper {
  constructor(
    @Inject(featuresConfig.KEY)
    private readonly features: ConfigType<typeof featuresConfig>,
  ) {}

  toDto(user: ActiveUser): MeResponseDto {
    return {
      id: user.id,
      orgId: user.orgId,
      email: user.email,
      role: user.role,
      systemRole: user.systemRole,
      name: user.name,
      scopes: getTokenSurfaceScopes(user.client, this.features),
    };
  }
}
