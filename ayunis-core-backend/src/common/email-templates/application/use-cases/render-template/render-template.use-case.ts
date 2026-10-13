import { Injectable } from '@nestjs/common';
import { TemplateRendererPort } from 'src/common/email-templates/application/ports/template-renderer.port';
import { RenderTemplateCommand } from './render-template.command';
import { RenderedEmailContent } from 'src/common/email-templates/domain/rendered-email-content.entity';

@Injectable()
export class RenderTemplateUseCase {
  constructor(private readonly templateRenderer: TemplateRendererPort) {}

  execute(command: RenderTemplateCommand): Promise<RenderedEmailContent> {
    return this.templateRenderer.renderTemplate(command.template);
  }
}
