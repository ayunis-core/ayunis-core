class ChatInput {
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

	submitButtonWith(options: Partial<Cypress.Timeoutable>) {
		return cy.get(`${this.rootLocator} button[data-testid="send"]`, options);
	}
}

export default new ChatInput();
