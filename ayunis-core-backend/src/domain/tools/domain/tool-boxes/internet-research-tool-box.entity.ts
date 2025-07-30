import { ToolBox } from '../tool-box.entity';
import { InternetSearchTool } from '../tools/internet-search-tool.entity';
import { WebsiteContentTool } from '../tools/website-content-tool.entity';

export class InternetResearchToolBox extends ToolBox {
  constructor() {
    super([new InternetSearchTool(), new WebsiteContentTool()]);
  }
}
