import ChatsPage from '@pages/chats.page';
import { E2eTest01 } from '@data/accounts/E2eTest01.account';
import { getTimestring } from '@helpers/time.helper';

describe('Chat Lifecycle', () => {
	it.skip('allows a user to create, rename and delete a chat', () => {
		const timestring = getTimestring();
		cy.login(E2eTest01.email, E2eTest01.password, E2eTest01.username);

		ChatsPage.chatInput.modelSelectTrigger.should("contain.text", "Claude Sonnet 4")

		ChatsPage.chatInput.textareaChatInput.type(`Name this chat ${timestring} and print the name of the model I am talking to`);
		ChatsPage.chatInput.submitButton.click();

		cy.reload(); // Has to be removed once the Sidebar updates itself
		// Make sure not to fail the test just because the external communication is slow
		ChatsPage.assistantMessagesWith({ timeout: Cypress.config('defaultCommandTimeout') * 5 }).should("contain.text", "Claude Sonnet 4");
		ChatsPage.spanTitle.should("contain.text", timestring);
		ChatsPage.sidebar.chats.should("contain.text", timestring);

		ChatsPage.sidebar.dropdownMenuTriggerForChat(timestring).click();
		ChatsPage.chatDropdown.buttonDelete.click();

		ChatsPage.confirmationDialogue.desctructiveOption.should("exist");
		ChatsPage.confirmationDialogue.desctructiveOption.click();

		ChatsPage.sidebar.chats.should("not.contain.text", timestring);
	});

	it('allows user to choose the provided models', () => {
		const timestring = getTimestring();
		cy.login(E2eTest01.email, E2eTest01.password, E2eTest01.username);

		ChatsPage.chatInput.modelSelectTrigger.click();
		ChatsPage.modelsDropdown.options.each(($element) => {
			const modelName  = $element.text();

			ChatsPage.modelsDropdown.options.contains(modelName).click();

			ChatsPage.chatInput.textareaChatInput.type(`Name this chat ${timestring} and print the name of the model I am talking to`);
			ChatsPage.chatInput.submitButton.click();
			// Make sure not to fail the test just because the external communication is slow
			ChatsPage.chatInput.submitButtonWith({ timeout: Cypress.config('defaultCommandTimeout') * 5 }).should("not.be.disabled");

			ChatsPage.assistantMessages.last().should("contain.text", modelName);

			ChatsPage.chatInput.modelSelectTrigger.click();
		});
	});
});
