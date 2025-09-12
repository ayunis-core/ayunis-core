import ChatPage from '@pages/chat.page';
import { E2eTestGeneral } from '@data/accounts/E2eTest01.account';
import { getTimestring } from '@helpers/time.helper';
import NewChatPage from '@pages/new-chat.page';

describe('Chat Lifecycle', () => {
	it('allows a user to create, rename and delete a chat', () => {
		const timestring = getTimestring();
		cy.login(E2eTestGeneral.email, E2eTestGeneral.username);

		NewChatPage.validateOn();
		NewChatPage.chatInput.modelSelectTrigger.should('contain.text', 'Claude Sonnet 4');

		NewChatPage.chatInput.textareaChatInput.type(
			`Name this chat ${timestring} and print the name of the model I am talking to`,
		);
		NewChatPage.chatInput.submitButton.click();

		cy.reload(); // Has to be removed once the Sidebar updates itself
		// Make sure not to fail the test just because the external communication is slow
		ChatPage.validateOn();
		cy.withTimeout('XLONG', () => {
			ChatPage.assistantMessages.should('contain.text', 'Claude Sonnet 4');
		});
		ChatPage.spanTitle.should('contain.text', timestring);
		ChatPage.sidebar.chats.should('contain.text', timestring);

		ChatPage.sidebar.dropdownMenuTriggerForChat(timestring).click();
		ChatPage.chatDropdown.buttonDelete.click();

		ChatPage.confirmationDialogue.desctructiveOption.should('exist');
		ChatPage.confirmationDialogue.desctructiveOption.click();

		ChatPage.sidebar.chats.should('not.contain.text', timestring);
	});

	it('allows user to choose the provided models', () => {
		const timestring = getTimestring();
		cy.login(E2eTestGeneral.email, E2eTestGeneral.username);
		NewChatPage.validateOn();

		NewChatPage.chatInput.modelSelectTrigger.click();
		NewChatPage.modelsDropdown.options.each(($element) => {
			const modelName = $element.text();

			ChatPage.modelsDropdown.options.contains(modelName).click();

			ChatPage.chatInput.textareaChatInput.type(
				`Name this chat ${timestring} and print the name of the model I am talking to`,
			);
			ChatPage.chatInput.submitButton.click();
			// Make sure not to fail the test just because the external communication is slow
			cy.withTimeout('XLONG', () => {
				ChatPage.chatInput.submitButton.should('not.be.disabled');
			});

			ChatPage.assistantMessages.last().should('contain.text', modelName);

			ChatPage.chatInput.modelSelectTrigger.click();
		});
	});
});
