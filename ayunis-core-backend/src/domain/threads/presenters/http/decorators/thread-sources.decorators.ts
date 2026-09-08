import { applyDecorators, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiExtraModels,
  ApiOperation,
  ApiParam,
  ApiResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import {
  SOURCE_FILE_API_BODY,
  SOURCE_FILE_UPLOAD_OPTIONS,
} from 'src/common/util/source-file-upload';
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
    UseInterceptors(FileInterceptor('file', SOURCE_FILE_UPLOAD_OPTIONS)),
    ApiResponse({
      status: 413,
      description: 'File exceeds the 25 MB upload limit',
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
