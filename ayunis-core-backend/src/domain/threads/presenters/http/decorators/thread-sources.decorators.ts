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
import { diskStorage } from 'multer';
import { randomUUID } from 'crypto';
import { extname } from 'path';
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
    /* eslint-disable sonarjs/content-length -- multer file size limit, not HTTP Content-Length */
    UseInterceptors(
      FileInterceptor('file', {
        storage: diskStorage({
          // eslint-disable-next-line sonarjs/todo-tag -- pre-existing, tracked separately
          // TODO: Move this to a separate service
          destination: './uploads',
          filename: (req, file, cb) => {
            const randomName = randomUUID();
            cb(null, `${randomName}${extname(file.originalname)}`);
          },
        }),
        limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
      }),
    ),
    /* eslint-enable sonarjs/content-length */
    ApiResponse({
      status: 413,
      description: 'File exceeds the 25 MB upload limit',
    }),
    ApiSourceListResponse(
      201,
      'The file source has been successfully added to the thread',
    ),
    ApiBody({
      schema: {
        type: 'object',
        properties: {
          file: {
            type: 'string',
            format: 'binary',
            description: 'The file to upload (max 25 MB)',
          },
        },
        required: ['file'],
      },
    }),
    ApiConsumes('multipart/form-data'),
    ApiThreadIdParam(),
    ApiOperation({ summary: 'Add a file source to a thread' }),
  );
}

export function ApiSourceCsvDownload() {
  return applyDecorators(
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
