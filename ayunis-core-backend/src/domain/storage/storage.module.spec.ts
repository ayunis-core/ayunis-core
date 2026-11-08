import { MODULE_METADATA } from '@nestjs/common/constants';
import { UploadObjectUseCase } from 'src/domain/storage/application/use-cases/upload-object/upload-object.use-case';
import { UploadOrgObjectUseCase } from 'src/domain/storage/application/use-cases/upload-org-object/upload-org-object.use-case';
import { UploadSystemObjectUseCase } from 'src/domain/storage/application/use-cases/upload-system-object/upload-system-object.use-case';
import { StorageModule } from 'src/domain/storage/storage.module';

describe('storage upload boundary', () => {
  it('exports the organisation-safe and system uploaders without exposing the primitive', () => {
    const exports: unknown[] = Reflect.getMetadata(
      MODULE_METADATA.EXPORTS,
      StorageModule,
    );

    expect(exports).toContain(UploadOrgObjectUseCase);
    expect(exports).toContain(UploadSystemObjectUseCase);
    expect(exports).not.toContain(UploadObjectUseCase);
  });
});
