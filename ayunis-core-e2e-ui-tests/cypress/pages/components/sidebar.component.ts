class Navigation {
	rootLocator = `div[data-testid="sidebar"]`;

	get buttonMenu() {
		return cy.get(`${this.rootLocator} button[data-testid="menu"]`);
	}
}

export default new Navigation();
