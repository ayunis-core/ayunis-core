import { Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { appConfig } from 'src/config/app.config';
import { UnexpectedOfficeAddinError } from 'src/domain/office-addins/application/office-addins.errors';
import { renderOutlookManifest } from 'src/domain/office-addins/application/util/render-outlook-manifest';

@Injectable()
export class GetOutlookManifestUseCase {
  constructor(
    @Inject(appConfig.KEY)
    private readonly app: ConfigType<typeof appConfig>,
  ) {}

  @HandleUnexpectedErrors(UnexpectedOfficeAddinError)
  execute(): Promise<string> {
    return Promise.resolve(renderOutlookManifest(this.app.frontend.baseUrl));
  }
}
