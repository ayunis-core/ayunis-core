import { Injectable } from '@nestjs/common';
import { TemplateRendererPort } from '../../ports/template-renderer.port';
import { RenderTemplateCommand } from './render-template.command';
import { RenderedEmailContent } from 'src/common/email-templates/domain/rendered-email-content.entity';

@Injectable()
export class RenderTemplateUseCase {
  constructor(private readonly templateRenderer: TemplateRendererPort) {}

  execute(command: RenderTemplateCommand): RenderedEmailContent {
    return this.templateRenderer.renderTemplate(command.template);
  }
}
