import { E2eTestGeneral } from '@data/accounts/E2eTest01.account';
import ChatsPage from '../pages/chats.page';

describe('Login Functionality', () => {
	it('allows login for a registered user', () => {
		cy.login(E2eTestGeneral.email, process.env.[`TEST_USER_PASSWORD`] ?? "");

		ChatsPage.navigation.buttonMenu.should(`contain.text`, E2eTestGeneral.username);
	});
});
