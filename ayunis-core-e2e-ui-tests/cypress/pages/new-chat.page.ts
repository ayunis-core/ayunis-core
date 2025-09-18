import { BasePage } from '@pages/base.page';
import ChatInput from '@pages/components/chat-input.component';
import ModelsDropdown from '@pages/components/models-dropdown.component';

class NewChatPage extends BasePage {
	// Properties
	path = `/chat`;

	// Components
	get chatInput() {
		return ChatInput;
	}

	get modelsDropdown() {
		return ModelsDropdown;
	}

	// Elements
	get spanTitle() {
		return cy.get(`span[data-testid="header"]`);
	}

	get assistantMessages() {
		return cy.get(`div[data-testid="assistant-message"]`);
	}

	get userMessages() {
		return cy.get(`div[data-testid="user-message"]`);
	}
}

export default new NewChatPage();
