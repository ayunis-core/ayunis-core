import { BaseComponent } from '@pages/components/base.component';

class ChatDropdown extends BaseComponent {
	rootLocator = `div[data-testid="chat-dropdown"]`;

	get buttonDelete() {
		return cy.get(`${this.rootLocator} div[data-testid="delete"]`);
	}
}

export default new ChatDropdown();
