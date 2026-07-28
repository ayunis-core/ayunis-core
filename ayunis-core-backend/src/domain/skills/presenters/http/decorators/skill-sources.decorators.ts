import { applyDecorators, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import {
  SOURCE_FILE_API_BODY,
  SOURCE_FILE_UPLOAD_OPTIONS,
} from 'src/common/util/source-file-upload';
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
    UseInterceptors(FileInterceptor('file', SOURCE_FILE_UPLOAD_OPTIONS)),
    ApiResponse({
      status: 413,
      description: 'File exceeds the upload limit (50 MB; CSV/XLSX 25 MB)',
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
    ApiBody(SOURCE_FILE_API_BODY),
    ApiConsumes('multipart/form-data'),
    ApiSkillIdParam(),
    ApiOperation({ summary: 'Add a file source to a skill' }),
  );
}
