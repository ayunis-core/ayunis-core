import { ListObjectsUseCase } from 'src/domain/storage/application/use-cases/list-objects/list-objects.use-case';
import { DeleteObjectUseCase } from 'src/domain/storage/application/use-cases/delete-object/delete-object.use-case';
import 'src/config/env';
import { randomUUID } from 'crypto';
import { EventEmitter2 } from '@nestjs/event-emitter';

jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () =>
    (
      _target: object,
      _propertyName: string | symbol,
      descriptor: PropertyDescriptor,
    ) =>
      descriptor,
}));

import storageConfig from 'src/config/storage.config';
import { MinioObjectStorageProvider } from 'src/domain/storage/infrastructure/providers/minio-object-storage.provider';
import { PurgeStoragePrefixesUseCase } from 'src/domain/storage/application/use-cases/purge-storage-prefixes/purge-storage-prefixes.use-case';
import { PurgeOrgStorageUseCase } from './purge-org-storage.use-case';
import { StorageOrgDeletionRequestedListener } from 'src/domain/storage/application/listeners/org-deletion-requested.listener';
import { OrgDeletionRequestedEvent } from 'src/iam/orgs/application/events/org-deletion-requested.event';
import { DeleteOrgUseCase } from 'src/iam/orgs/application/use-cases/delete-org/delete-org.use-case';
import { DeleteOrgCommand } from 'src/iam/orgs/application/use-cases/delete-org/delete-org.command';
import { StorageObjectUpload } from 'src/domain/storage/domain/storage-object-upload.entity';
import { StorageUrl } from 'src/domain/storage/domain/storage-url.entity';
import { orgStoragePrefixes } from 'src/domain/storage/domain/org-storage-layout';
import { UploadObjectUseCase } from 'src/domain/storage/application/use-cases/upload-object/upload-object.use-case';
import { UploadOrgObjectUseCase } from 'src/domain/storage/application/use-cases/upload-org-object/upload-org-object.use-case';
import { UploadOrgObjectCommand } from 'src/domain/storage/application/use-cases/upload-org-object/upload-org-object.command';
import type { AssertOrgActiveUseCase } from 'src/iam/orgs/application/use-cases/assert-org-active/assert-org-active.use-case';
import { Org } from 'src/iam/orgs/domain/org.entity';
import { OrgAccessError } from 'src/iam/orgs/application/orgs.errors';

it('deletes all org storage layouts immediately, preserves other orgs and keeps files when row deletion fails', async () => {
  const orgId = randomUUID();
  const otherId = randomUUID();
  const baseConfig = storageConfig();
  const config = {
    ...baseConfig,
    minio: { ...baseConfig.minio, bucket: `ayc35-${randomUUID()}` },
  };
  const storage = new MinioObjectStorageProvider(config);
  const owned = orgStoragePrefixes(orgId).map(
    (prefix) => `${prefix}ayc35-regression.txt`,
  );
  const other = `${otherId}/ayc35-control.txt`;
  const purge = new PurgeOrgStorageUseCase(
    new PurgeStoragePrefixesUseCase(
      new ListObjectsUseCase(storage, config),
      new DeleteObjectUseCase(storage, config),
    ),
  );
  const listener = new StorageOrgDeletionRequestedListener(purge);
  const events = new EventEmitter2();
  events.on(OrgDeletionRequestedEvent.EVENT_NAME, (event) =>
    listener.handleOrgDeletionRequested(event as OrgDeletionRequestedEvent),
  );
  const rows = {
    lockForLifecycleMutation: jest.fn().mockResolvedValue(undefined),
    delete: jest
      .fn()
      .mockRejectedValueOnce(new Error('preserve rows'))
      .mockResolvedValue(undefined),
  };
  const deletion = new DeleteOrgUseCase(rows as never, events);
  const url = (key: string) => new StorageUrl(key, config.minio.bucket);
  await storage.createBucket(config.minio.bucket);
  try {
    for (const key of [...owned, other])
      await storage.upload(
        new StorageObjectUpload(key, Buffer.from('isolated AYC-35 fixture')),
      );
    await expect(
      deletion.execute(new DeleteOrgCommand(orgId, 'test', true)),
    ).rejects.toBeDefined();
    for (const key of owned) expect(await storage.exists(url(key))).toBe(true);
    await deletion.execute(new DeleteOrgCommand(orgId, 'test', true));
    for (const key of owned) expect(await storage.exists(url(key))).toBe(false);
    expect(await storage.exists(url(other))).toBe(true);
    for (const prefix of orgStoragePrefixes(randomUUID()))
      expect(await storage.listObjects(prefix)).toEqual([]);
  } finally {
    for (const key of [...owned, other]) await storage.delete(url(key));
    await storage.deleteBucket(config.minio.bucket);
  }
}, 30_000);

it('removes an object that finishes uploading after its organisation becomes inactive', async () => {
  const orgId = randomUUID();
  const baseConfig = storageConfig();
  const config = {
    ...baseConfig,
    minio: { ...baseConfig.minio, bucket: `ayc35-${randomUUID()}` },
  };
  const storage = new MinioObjectStorageProvider(config);
  const assertOrgActive = {
    execute: jest
      .fn()
      .mockResolvedValueOnce(
        new Org({ id: orgId, name: 'Late upload', sessionVersion: 3 }),
      )
      .mockRejectedValueOnce(new OrgAccessError()),
  } as unknown as jest.Mocked<AssertOrgActiveUseCase>;
  const upload = new UploadOrgObjectUseCase(
    assertOrgActive,
    new UploadObjectUseCase(storage, config),
    new DeleteObjectUseCase(storage, config),
  );
  const key = `${orgId}/processing/late-upload.txt`;
  const url = new StorageUrl(key, config.minio.bucket);
  await storage.createBucket(config.minio.bucket);

  try {
    await expect(
      upload.execute(
        new UploadOrgObjectCommand(orgId, key, Buffer.from('late upload')),
      ),
    ).rejects.toBeInstanceOf(OrgAccessError);
    expect(await storage.exists(url)).toBe(false);
  } finally {
    if (await storage.exists(url)) await storage.delete(url);
    await storage.deleteBucket(config.minio.bucket);
  }
}, 30_000);
