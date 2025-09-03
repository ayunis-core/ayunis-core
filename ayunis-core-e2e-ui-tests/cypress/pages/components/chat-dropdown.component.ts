class ChatDropdown {
	rootLocator = `div[data-testid="chat-dropdown"]`;

	get buttonDelete() {
		return cy.get(`${this.rootLocator} div[data-testid="delete"]`);
	}
}

export default new ChatDropdown();
