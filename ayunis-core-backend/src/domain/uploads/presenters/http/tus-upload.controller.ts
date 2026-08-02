import { All, Controller, Req, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import type { UUID } from 'crypto';
import {
  CurrentUser,
  UserProperty,
} from 'src/iam/authentication/application/decorators/current-user.decorator';
import { TusUploadService } from '../../application/services/tus-upload.service';

/**
 * The tus protocol endpoint (resumable, chunked uploads). Protocol requests
 * are delegated verbatim to the tus server; completed uploads are consumed by
 * the finalize endpoints on the thread/skill/knowledge-base controllers.
 * Excluded from Swagger — the wire format is the tus spec, not JSON.
 */
@ApiExcludeController()
@Controller('uploads/tus')
export class TusUploadController {
  constructor(private readonly tusUploadService: TusUploadService) {}

  @All()
  async handleRoot(
    @CurrentUser(UserProperty.ID) userId: UUID,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    await this.tusUploadService.handle(req, res, userId);
  }

  @All(':uploadId')
  async handleUpload(
    @CurrentUser(UserProperty.ID) userId: UUID,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    await this.tusUploadService.handle(req, res, userId);
  }
}
