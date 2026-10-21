import { applyDecorators, UseInterceptors } from '@nestjs/common';
import {
  ApiBody,
  ApiConsumes,
  ApiExtraModels,
  ApiOperation,
  ApiParam,
  ApiResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { SOURCE_FILE_API_BODY } from 'src/common/util/source-file-upload';
import { UploadLimitFileInterceptor } from 'src/common/http/upload-limit-file.interceptor';
import {
  CSVDataSourceResponseDto,
  FileSourceResponseDto,
  UrlSourceResponseDto,
} from 'src/domain/threads/presenters/http/dto/get-thread-response.dto/source-response.dto';

export function ApiThreadIdParam() {
  return ApiParam({
    name: 'id',
    description: 'The UUID of the thread',
    type: 'string',
    format: 'uuid',
  });
}

export function ApiSourceIdParam(description: string) {
  return ApiParam({
    name: 'sourceId',
    description,
    type: 'string',
    format: 'uuid',
  });
}

export function ApiSourceListResponse(status: number, description: string) {
  return applyDecorators(
    ApiResponse({
      status,
      description,
      schema: {
        type: 'array',
        items: {
          oneOf: [
            { $ref: getSchemaPath(FileSourceResponseDto) },
            { $ref: getSchemaPath(UrlSourceResponseDto) },
            { $ref: getSchemaPath(CSVDataSourceResponseDto) },
          ],
        },
      },
    }),
    ApiExtraModels(
      FileSourceResponseDto,
      UrlSourceResponseDto,
      CSVDataSourceResponseDto,
    ),
  );
}

// Decorators are listed bottom-up: applyDecorators applies them in array order,
// whereas a stacked decorator list applies bottom-to-top. Keeping that order
// preserves the emitted OpenAPI (parameter order, response key order) exactly.
export function ApiFileSourceUpload() {
  return applyDecorators(
    UseInterceptors(UploadLimitFileInterceptor),
    ApiResponse({
      status: 413,
      description:
        "File exceeds the deployment's upload limit (25 MB by default)",
    }),
    ApiSourceListResponse(
      201,
      'The file source has been successfully added to the thread',
    ),
    ApiBody(SOURCE_FILE_API_BODY),
    ApiConsumes('multipart/form-data'),
    ApiThreadIdParam(),
    ApiOperation({ summary: 'Add a file source to a thread' }),
  );
}
