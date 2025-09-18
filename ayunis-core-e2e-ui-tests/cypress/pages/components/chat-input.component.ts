import { BaseComponent } from '@pages/components/base.component';

class ChatInput extends BaseComponent {
	rootLocator = `div[data-testid="chat-input"]`;

	get textareaChatInput() {
		return cy.get(`${this.rootLocator} textarea[data-testid="input"]`);
	}

	get modelSelectTrigger() {
		return cy.get(`${this.rootLocator} button[data-testid="select-trigger"]`);
	}

	get submitButton() {
		return cy.get(`${this.rootLocator} button[data-testid="send"]`);
	}
}

export default new ChatInput();
