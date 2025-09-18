import { BasePage } from '@pages/base.page';
import ChatInput from '@pages/components/chat-input.component';
import ModelsDropdown from '@pages/components/models-dropdown.component';
import ChatDropdown from '@pages/components/chat-dropdown.component';
import ConfirmationDialogue from '@pages/components/confirmation-dialogue';
import Sidebar from '@pages/components/sidebar.component';

class ChatPage extends BasePage {
	// Properties
	path = `/chats/{guid}`;

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

	// Helpers
	override open = (guid: string) => {
		cy.visit(this.path.replace(`{guid}`, guid));
		cy.urlpath().should('eql', this.path);
	};

	override validateOn = (guid?: string) => {
		if(guid) {
			cy.urlpath().should('eq', this.path.replace(`{guid}`, guid));
		} else {
			cy.urlpath().should('contains', this.path.replace(`{guid}`, ``));
		}
	};
}

export default new ChatPage();
