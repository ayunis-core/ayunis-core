import { applyDecorators, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import { SkillResponseDto } from '../dto/skill-response.dto';

export function ApiSkillIdParam() {
  return ApiParam({
    name: 'id',
    description: 'The UUID of the skill',
    type: 'string',
    format: 'uuid',
  });
}

// Decorators are listed bottom-up: applyDecorators applies them in array order,
// whereas a stacked decorator list applies bottom-to-top. Keeping that order
// preserves the emitted OpenAPI (parameter order, response key order) exactly.
export function ApiSkillFileSourceUpload() {
  return applyDecorators(
    /* eslint-disable sonarjs/content-length -- multer file size limit, not HTTP Content-Length */
    UseInterceptors(
      FileInterceptor('file', {
        storage: diskStorage({
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
    ApiResponse({
      status: 400,
      description: 'Invalid or unsupported file type',
    }),
    ApiResponse({ status: 404, description: 'Skill not found' }),
    ApiResponse({
      status: 201,
      description: 'The file source has been successfully added to the skill',
      type: SkillResponseDto,
    }),
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
    ApiSkillIdParam(),
    ApiOperation({ summary: 'Add a file source to a skill' }),
  );
}
