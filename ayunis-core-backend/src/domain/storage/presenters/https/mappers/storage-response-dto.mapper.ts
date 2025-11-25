import { Injectable } from '@nestjs/common';
import { StorageObject } from '../../../domain/storage-object.entity';
import { UploadFileResponseDto } from '../dto/upload-file-response.dto';

@Injectable()
export class StorageResponseDtoMapper {
  toUploadFileDto(storageObject: StorageObject): UploadFileResponseDto {
    return {
      objectName: storageObject.objectName,
      size: storageObject.size,
      etag: storageObject.etag,
      contentType: storageObject.contentType,
      lastModified: storageObject.lastModified,
    };
  }
}
