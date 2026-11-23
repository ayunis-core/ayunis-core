import { Injectable } from '@nestjs/common';
import {
  Artifact,
  DocumentArtifact,
} from 'src/domain/artifacts/domain/artifact.entity';
import { ArtifactVersion } from 'src/domain/artifacts/domain/artifact-version.entity';
import {
  ArtifactPiiMaskResponseDto,
  ArtifactResponseDto,
  ArtifactVersionResponseDto,
} from 'src/domain/artifacts/presenters/http/dtos/artifact-response.dto';

@Injectable()
export class ArtifactDtoMapper {
  toDto(artifact: Artifact): ArtifactResponseDto {
    const dto = new ArtifactResponseDto();
    dto.id = artifact.id;
    dto.type = artifact.type;
    dto.ownerType = artifact.owner.type;
    if (artifact.owner.type === 'personal') {
      dto.userId = artifact.owner.userId;
    } else {
      dto.workspaceId = artifact.owner.workspaceId;
    }
    dto.creatorId = artifact.creatorId;
    dto.title = artifact.title;
    dto.isAnonymous = artifact.isAnonymous;
    dto.letterheadId =
      artifact instanceof DocumentArtifact ? artifact.letterheadId : null;
    dto.currentVersionNumber = artifact.currentVersionNumber;
    dto.createdAt = artifact.createdAt.toISOString();
    dto.updatedAt = artifact.updatedAt.toISOString();

    if (artifact.versions.length > 0) {
      dto.versions = artifact.versions.map((v) => this.toVersionDto(v));
    }
    if (artifact.isAnonymous) {
      dto.piiMasks = toPiiMaskDtos(artifact);
    }

    return dto;
  }

  toVersionDto(version: ArtifactVersion): ArtifactVersionResponseDto {
    const dto = new ArtifactVersionResponseDto();
    dto.id = version.id;
    dto.artifactId = version.artifactId;
    dto.versionNumber = version.versionNumber;
    dto.content = version.content;
    dto.authorType = version.authorType;
    dto.authorId = version.authorId;
    dto.createdAt = version.createdAt.toISOString();
    return dto;
  }
}

/**
 * With the versions, the whole dictionary; in lists, only the entries the
 * title shows.
 */
function toPiiMaskDtos(artifact: Artifact): ArtifactPiiMaskResponseDto[] {
  const masks =
    artifact.versions.length > 0
      ? artifact.piiMasks
      : artifact.piiMasks.filter((mask) => artifact.title.includes(mask.token));
  return masks.map((mask) => ({
    token: mask.token,
    value: mask.value,
    category: mask.category,
  }));
}
