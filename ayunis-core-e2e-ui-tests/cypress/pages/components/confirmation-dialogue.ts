class ConfirmationDialogue {
	rootLocator = `div[role="dialog"]`;

	get desctructiveOption() {
		return cy.get(`${this.rootLocator} button.bg-destructive`);
	}
}

export default new ConfirmationDialogue();
