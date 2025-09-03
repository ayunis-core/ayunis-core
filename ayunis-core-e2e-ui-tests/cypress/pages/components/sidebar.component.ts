class Sidebar {
	rootLocator = `div[data-testid="sidebar"]`;

	get buttonMenu() {
		return cy.get(`${this.rootLocator} button[data-testid="menu"]`);
	}

	get chats() {
		return cy.get(`${this.rootLocator} li[data-testid="chat"]`);
	}

	// Helpers
	dropdownMenuTriggerForChat(title: string) {
		return this.chats.contains(title).within(() => {
			cy.get(`button[data-testid="dropdown-menu-trigger"]`).invoke('show')
		});
	}
	forceClickDropdownMenuTriggerForChat(title: string) {
		this.chats.contains(title).closest(`li[data-testid="chat"]`).find(`button[data-testid="dropdown-menu-trigger"]`).click({ force: true });
	}

}

export default new Sidebar();
