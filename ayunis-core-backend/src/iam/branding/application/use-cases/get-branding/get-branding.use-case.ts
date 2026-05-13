import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { ApplicationError } from 'src/common/errors/base.error';
import { FindOrgByIdUseCase } from 'src/iam/orgs/application/use-cases/find-org-by-id/find-org-by-id.use-case';
import { FindOrgByIdQuery } from 'src/iam/orgs/application/use-cases/find-org-by-id/find-org-by-id.query';
import { GetPresignedUrlUseCase } from 'src/domain/storage/application/use-cases/get-presigned-url/get-presigned-url.use-case';
import { GetPresignedUrlCommand } from 'src/domain/storage/application/use-cases/get-presigned-url/get-presigned-url.command';
import { BrandingRepository } from '../../ports/branding.repository';
import { UnexpectedBrandingError } from '../../branding.errors';
import type { GetBrandingQuery } from './get-branding.query';

const PRESIGNED_URL_TTL = 3600;
const CACHE_TTL_MS = 50 * 60 * 1000; // 10 min safety margin before URL expiry

interface FaviconCacheEntry {
  storagePath: string;
  url: string;
  expiresAt: number;
}

export interface ResolvedBranding {
  name: string;
  // null = platform default; falls back to the org name when no branding
  // row exists (same observable behavior as an untouched org).
  displayName: string | null;
  faviconUrl: string | null;
}

@Injectable()
export class GetBrandingUseCase {
  private readonly logger = new Logger(GetBrandingUseCase.name);
  private readonly faviconUrlCache = new Map<UUID, FaviconCacheEntry>();

  constructor(
    private readonly brandingRepository: BrandingRepository,
    private readonly findOrgByIdUseCase: FindOrgByIdUseCase,
    private readonly getPresignedUrlUseCase: GetPresignedUrlUseCase,
  ) {}

  async execute(query: GetBrandingQuery): Promise<ResolvedBranding> {
    this.logger.debug('Getting branding', { orgId: query.orgId });

    try {
      const org = await this.findOrgByIdUseCase.execute(
        new FindOrgByIdQuery(query.orgId),
      );
      const branding = await this.brandingRepository.findByOrgId(query.orgId);

      const faviconUrl = await this.resolveFaviconUrl(
        query.orgId,
        branding?.faviconStoragePath ?? null,
      );

      return {
        name: org.name,
        displayName: branding ? branding.displayName : org.name,
        faviconUrl,
      };
    } catch (error) {
      if (error instanceof ApplicationError) throw error;

      this.logger.error('Failed to get branding', {
        error: error instanceof Error ? error.message : 'Unknown error',
        orgId: query.orgId,
      });

      throw new UnexpectedBrandingError('get', {
        orgId: query.orgId,
        ...(error instanceof Error && { originalError: error.message }),
      });
    }
  }

  invalidateCache(orgId: UUID): void {
    this.faviconUrlCache.delete(orgId);
  }

  private async resolveFaviconUrl(
    orgId: UUID,
    storagePath: string | null,
  ): Promise<string | null> {
    if (!storagePath) {
      this.faviconUrlCache.delete(orgId);
      return null;
    }

    const cached = this.faviconUrlCache.get(orgId);
    if (cached?.storagePath === storagePath && cached.expiresAt > Date.now()) {
      return cached.url;
    }

    try {
      const contentType = storagePath.endsWith('.png')
        ? 'image/png'
        : 'image/jpeg';

      const presignedUrl = await this.getPresignedUrlUseCase.execute(
        new GetPresignedUrlCommand(
          storagePath,
          PRESIGNED_URL_TTL,
          undefined,
          contentType,
        ),
      );

      this.faviconUrlCache.set(orgId, {
        storagePath,
        url: presignedUrl.url,
        expiresAt: Date.now() + CACHE_TTL_MS,
      });

      return presignedUrl.url;
    } catch {
      this.logger.warn('Failed to resolve favicon URL', { storagePath });
      return null;
    }
  }
}
