import { Injectable, Logger } from '@nestjs/common';
import { ApplicationError } from 'src/common/errors/base.error';
import { FindOrgByIdUseCase } from 'src/iam/orgs/application/use-cases/find-org-by-id/find-org-by-id.use-case';
import { FindOrgByIdQuery } from 'src/iam/orgs/application/use-cases/find-org-by-id/find-org-by-id.query';
import { UploadObjectUseCase } from 'src/domain/storage/application/use-cases/upload-object/upload-object.use-case';
import { UploadObjectCommand } from 'src/domain/storage/application/use-cases/upload-object/upload-object.command';
import { DeleteObjectUseCase } from 'src/domain/storage/application/use-cases/delete-object/delete-object.use-case';
import { DeleteObjectCommand } from 'src/domain/storage/application/use-cases/delete-object/delete-object.command';
import { Branding } from '../../../domain/branding.entity';
import { BrandingRepository } from '../../ports/branding.repository';
import {
  BrandingInvalidFileError,
  UnexpectedBrandingError,
} from '../../branding.errors';
import { GetBrandingUseCase } from '../get-branding/get-branding.use-case';
import type { UpdateBrandingCommand } from './update-branding.command';

const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg'] as const;
const MAX_FILE_SIZE = 512 * 1024;

@Injectable()
export class UpdateBrandingUseCase {
  private readonly logger = new Logger(UpdateBrandingUseCase.name);

  constructor(
    private readonly brandingRepository: BrandingRepository,
    private readonly uploadObjectUseCase: UploadObjectUseCase,
    private readonly deleteObjectUseCase: DeleteObjectUseCase,
    private readonly getBrandingUseCase: GetBrandingUseCase,
    private readonly findOrgByIdUseCase: FindOrgByIdUseCase,
  ) {}

  async execute(command: UpdateBrandingCommand): Promise<Branding> {
    this.logger.log('Updating branding', { orgId: command.orgId });

    try {
      const branding = await this.findOrCreateBranding(command);

      if (command.displayName !== undefined) {
        // Empty string -> null (admin cleared the field -> fall back to
        // platform default in the sidebar).
        const trimmed =
          command.displayName === null ? null : command.displayName.trim();
        branding.displayName = trimmed === '' ? null : trimmed;
      }

      const previousPath = await this.applyFaviconChange(command, branding);

      const saved = await this.brandingRepository.upsert(branding);
      this.getBrandingUseCase.invalidateCache(command.orgId);

      // Delete the replaced object only after the row is persisted, so a
      // failed update never leaves the database referencing a deleted file.
      if (previousPath && previousPath !== saved.faviconStoragePath) {
        await this.deleteStorageObject(previousPath);
      }

      this.logger.debug('Branding updated', { orgId: command.orgId });
      return saved;
    } catch (error) {
      if (error instanceof ApplicationError) throw error;

      this.logger.error('Failed to update branding', {
        error: error instanceof Error ? error.message : 'Unknown error',
        orgId: command.orgId,
      });

      throw new UnexpectedBrandingError('update', {
        orgId: command.orgId,
        ...(error instanceof Error && { originalError: error.message }),
      });
    }
  }

  private async findOrCreateBranding(
    command: UpdateBrandingCommand,
  ): Promise<Branding> {
    const existing = await this.brandingRepository.findByOrgId(command.orgId);
    if (existing) {
      return existing;
    }

    // A missing row falls back to the org name in the read path. Materialize
    // that fallback when the first write doesn't set a displayName, so the
    // sidebar doesn't silently switch to the platform default.
    const org = await this.findOrgByIdUseCase.execute(
      new FindOrgByIdQuery(command.orgId),
    );
    return new Branding({ orgId: command.orgId, displayName: org.name });
  }

  /**
   * Uploads a new favicon (overwriting in place when the path is unchanged)
   * or clears the stored path. Never deletes storage objects itself — returns
   * the previous path so the caller can delete it after the DB write commits.
   */
  private async applyFaviconChange(
    command: UpdateBrandingCommand,
    branding: Branding,
  ): Promise<string | null> {
    if (command.faviconBuffer) {
      this.validateFile(command.faviconBuffer, command.faviconMimeType);

      const ext = command.faviconMimeType === 'image/png' ? 'png' : 'jpg';
      const storagePath = `${command.orgId}/branding/favicon.${ext}`;
      const previousPath = branding.faviconStoragePath;

      await this.uploadObjectUseCase.execute(
        new UploadObjectCommand(storagePath, command.faviconBuffer),
      );
      branding.faviconStoragePath = storagePath;
      return previousPath;
    }

    if (command.removeFavicon && branding.faviconStoragePath) {
      const previousPath = branding.faviconStoragePath;
      branding.faviconStoragePath = null;
      return previousPath;
    }

    return null;
  }

  private validateFile(buffer: Buffer, mimeType?: string): void {
    if (
      !mimeType ||
      !ALLOWED_MIME_TYPES.includes(
        mimeType as (typeof ALLOWED_MIME_TYPES)[number],
      )
    ) {
      throw new BrandingInvalidFileError('File must be PNG or JPEG');
    }
    if (buffer.length > MAX_FILE_SIZE) {
      throw new BrandingInvalidFileError('File must be smaller than 512 KB');
    }
  }

  private async deleteStorageObject(storagePath: string): Promise<void> {
    try {
      await this.deleteObjectUseCase.execute(
        new DeleteObjectCommand(storagePath),
      );
    } catch {
      this.logger.warn('Failed to delete old favicon', { storagePath });
    }
  }
}
