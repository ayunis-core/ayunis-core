import { Injectable } from '@nestjs/common';
import { Artifact } from '../../../domain/artifact.entity';
import { ArtifactVersion } from '../../../domain/artifact-version.entity';
import {
  ArtifactResponseDto,
  ArtifactVersionResponseDto,
} from '../dtos/artifact-response.dto';

@Injectable()
export class ArtifactDtoMapper {
  toDto(artifact: Artifact): ArtifactResponseDto {
    const dto = new ArtifactResponseDto();
    dto.id = artifact.id;
    dto.threadId = artifact.threadId;
    dto.userId = artifact.userId;
    dto.title = artifact.title;
    dto.currentVersionNumber = artifact.currentVersionNumber;
    dto.createdAt = artifact.createdAt.toISOString();
    dto.updatedAt = artifact.updatedAt.toISOString();

    if (artifact.versions && artifact.versions.length > 0) {
      dto.versions = artifact.versions.map((v) => this.toVersionDto(v));
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
