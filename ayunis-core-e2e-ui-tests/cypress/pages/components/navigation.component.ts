class Navigation {
	rootLocator = `div[data-sidebar="sidebar"]`;

	get buttonMenu() {
		return cy.get(`${this.rootLocator} button[data-slot="dropdown-menu-trigger"]`);
	}
}

export default new Navigation();
