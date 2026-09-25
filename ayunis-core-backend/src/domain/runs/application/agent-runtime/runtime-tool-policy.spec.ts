import { BarChartTool } from 'src/domain/tools/domain/tools/bar-chart-tool.entity';
import { CreateCalendarEventTool } from 'src/domain/tools/domain/tools/create-calendar-event-tool.entity';
import { CreateDocumentTool } from 'src/domain/tools/domain/tools/create-document-tool.entity';
import { CreateSkillTool } from 'src/domain/tools/domain/tools/create-skill-tool.entity';
import { EditSkillTool } from 'src/domain/tools/domain/tools/edit-skill-tool.entity';
import { InstallMarketplaceSkillTool } from 'src/domain/tools/domain/tools/install-marketplace-skill-tool.entity';
import { InternetSearchTool } from 'src/domain/tools/domain/tools/internet-search-tool.entity';
import { MarketplaceSearchTool } from 'src/domain/tools/domain/tools/marketplace-search-tool.entity';
import { SendEmailTool } from 'src/domain/tools/domain/tools/send-email-tool.entity';
import {
  isAcknowledgementOnlyTool,
  isExternallyHandledTool,
  isHybridArtifactTool,
} from './runtime-tool-policy';

describe('runtime tool policy', () => {
  describe(isExternallyHandledTool.name, () => {
    it.each([
      ['send_email', new SendEmailTool()],
      ['create_calendar_event', new CreateCalendarEventTool()],
      ['create_skill', new CreateSkillTool()],
      ['edit_skill', new EditSkillTool()],
      ['install_marketplace_skill', new InstallMarketplaceSkillTool()],
    ])('ends the run with the %s call for the client to handle', (_, tool) => {
      expect(isExternallyHandledTool(tool)).toBe(true);
    });

    it('leaves backend-executed tools to their handlers', () => {
      expect(isExternallyHandledTool(new MarketplaceSearchTool())).toBe(false);
      expect(isExternallyHandledTool(new InternetSearchTool())).toBe(false);
    });
  });

  it('classifies chart tools as acknowledgement-only', () => {
    expect(isAcknowledgementOnlyTool(new BarChartTool())).toBe(true);
    expect(isAcknowledgementOnlyTool(new InstallMarketplaceSkillTool())).toBe(
      false,
    );
  });

  it('classifies document tools as hybrid artifact tools', () => {
    expect(isHybridArtifactTool(new CreateDocumentTool())).toBe(true);
    expect(isHybridArtifactTool(new InstallMarketplaceSkillTool())).toBe(false);
  });
});
