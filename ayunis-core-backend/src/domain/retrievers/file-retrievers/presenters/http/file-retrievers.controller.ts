import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ProcessFileUseCase } from '../../application/use-cases/process-file/process-file.use-case';
import { ProcessFileCommand } from '../../application/use-cases/process-file/process-file.command';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiConsumes,
} from '@nestjs/swagger';

@ApiTags('retrievers')
@Controller('retrievers/file')
export class FileRetrieversController {
  constructor(private readonly processFileUseCase: ProcessFileUseCase) {}

  @Post()
  @ApiOperation({ summary: 'Process content from a file' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: 200,
    description: 'The file has been successfully processed',
  })
  @UseInterceptors(FileInterceptor('file'))
  async retrieveFile(@UploadedFile() file: Express.Multer.File) {
    return this.processFileUseCase.execute(
      new ProcessFileCommand(file.buffer, file.originalname),
    );
  }
}
