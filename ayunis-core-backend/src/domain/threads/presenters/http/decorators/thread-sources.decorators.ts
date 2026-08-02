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
} from '../dto/get-thread-response.dto/source-response.dto';

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
      description: 'File exceeds the upload limit (50 MB; CSV/XLSX 25 MB)',
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

export function ApiSourceCsvDownload() {
  return applyDecorators(
    ApiResponse({
      status: 409,
      description: 'Source is still processing and has no data yet',
    }),
    ApiResponse({
      status: 400,
      description: 'Source is not a CSV data source',
    }),
    ApiResponse({ status: 404, description: 'Thread or source not found' }),
    ApiResponse({
      status: 200,
      description: 'Returns the source as a CSV file',
      content: {
        'text/csv': {
          schema: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    }),
    ApiSourceIdParam('The UUID of the source to download'),
    ApiThreadIdParam(),
    ApiOperation({ summary: 'Download a data source as CSV' }),
  );
}
