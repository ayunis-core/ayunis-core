import { MODULE_METADATA } from '@nestjs/common/constants';
import { UploadObjectUseCase } from 'src/domain/storage/application/use-cases/upload-object/upload-object.use-case';
import { UploadOrgObjectUseCase } from 'src/domain/storage/application/use-cases/upload-org-object/upload-org-object.use-case';
import { StorageModule } from 'src/domain/storage/storage.module';

describe('storage upload boundary', () => {
  it('exports the organisation-safe uploader without exposing the primitive', () => {
    const exports: unknown[] = Reflect.getMetadata(
      MODULE_METADATA.EXPORTS,
      StorageModule,
    );

    expect(exports).toContain(UploadOrgObjectUseCase);
    expect(exports).not.toContain(UploadObjectUseCase);
  });
});
