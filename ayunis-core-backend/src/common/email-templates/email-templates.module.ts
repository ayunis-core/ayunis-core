import { Module } from '@nestjs/common';
import { MjmlHandler } from './infrastructure/mjml/mjml.handler';
import { TemplateRendererPort } from './application/ports/template-renderer.port';
import { RenderTemplateUseCase } from './application/use-cases/render-template/render-template.use-case';

@Module({
  providers: [
    RenderTemplateUseCase,
    { provide: TemplateRendererPort, useClass: MjmlHandler },
  ],
  exports: [RenderTemplateUseCase],
})
export class EmailTemplatesModule {}
