import Navigation from './components/navigation.component';

class ChatsPage {
	// Properties
	path = `/chats`;

	// Components
	get navigation() {
		return Navigation;
	}

	// Elements

	// Helpers
	validateOn = () => {
		cy.urlpath().should('eq', this.path);
	};
}

export default new ChatsPage();
