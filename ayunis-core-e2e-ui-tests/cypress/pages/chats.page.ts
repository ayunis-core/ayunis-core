import { BasePage } from '@pages/base.page';
import ChatInput from './components/chat-input.component';
import ModelsDropdown from './components/models-dropdown.component';
import ChatDropdown from './components/chat-dropdown.component';
import ConfirmationDialogue from '@pages/components/confirmation-dialogue';
import Sidebar from './components/sidebar.component';

class ChatsPage extends BasePage {
	// Properties
	path = `/chats`;

	// Components
	get sidebar() {
		return Sidebar;
	}

	get chatInput() {
		return ChatInput;
	}

	get modelsDropdown() {
		return ModelsDropdown;
	}

	get chatDropdown() {
		return ChatDropdown;
	}

	get confirmationDialogue() {
		return ConfirmationDialogue;
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

export default new ChatsPage();
