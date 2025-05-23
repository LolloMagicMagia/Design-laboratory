const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const assert = require('assert');

async function testMessageSendingFlow() {
    // 1. Browser configuration
    let options = new chrome.Options();
    options.addArguments([
        //'--headless',
        '--no-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--log-level=3'
    ]);

    let driver = await new Builder()
        .forBrowser('chrome')
        .setChromeOptions(options)
        .build();

    try {
        // 2. Open the chat page
        await driver.get('http://localhost:3000');
        console.log('Opened homepage');

        // 3. Wait for and select the first chat
        await driver.wait(until.elementLocated(By.css('.chat-list-item'), 10000));
        const chatItems = await driver.findElements(By.css('.chat-list-item'));
        assert(chatItems.length > 0, "No chats found");

        const firstChat = chatItems[0];
        const chatName = await firstChat.findElement(By.css('.chat-name')).getText();
        console.log(`Selected chat: "${chatName}"`);
        await firstChat.click();

        // 4. Verify chat page loaded
        await driver.wait(until.urlContains('/chat/'), 5000);
        await driver.wait(until.elementLocated(By.css('.message-list')), 5000);
        console.log('Chat page loaded successfully');

        // 5. Prepare test message
        const testMessage = `Test message ${new Date().getTime()}`;

        // 6. Find and interact with message input
        const messageInput = await driver.wait(
            until.elementLocated(By.css('.message-input')),
            5000
        );
        await messageInput.sendKeys(testMessage);
        console.log(`Entered message: "${testMessage}"`);

        // 7. Submit the message
        const sendButton = await driver.findElement(By.css('.message-send-button'));
        await sendButton.click();
        console.log('Clicked send button');

        // 8. Verify message appears in chat
        await driver.wait(async () => {
            const messages = await driver.findElements(By.css('.message-sent'));
            if (messages.length === 0) return false;

            const lastMessage = await messages[messages.length - 1].getText();
            return lastMessage.includes(testMessage);
        }, 10000);
        console.log('Message successfully appeared in chat');

        // 9. Navigate back to chat list
        const backButton = await driver.findElement(By.css('.btn.btn-icon'));
        await backButton.click();
        await driver.wait(until.urlIs('http://localhost:3000/'), 5000);
        console.log('Returned to chat list');

        // 10. Reopen the same chat
        await driver.wait(until.elementLocated(By.css('.chat-list-item')), 5000);
        const sameChat = await driver.findElements(By.css('.chat-list-item'));
        await sameChat[0].click();
        await driver.wait(until.urlContains('/chat/'), 5000);
        console.log('Reopened the same chat');

        // 11. Verify the message persists
        await driver.wait(async () => {
            const messages = await driver.findElements(By.css('.message-sent'));
            if (messages.length === 0) return false;

            const lastMessage = await messages[messages.length - 1].getText();
            return lastMessage.includes(testMessage);
        }, 5000);
        console.log('Verified message persistence');

        console.log('✅ Test passed: Complete message flow works correctly');
    } catch (error) {
        console.error('❌ Test failed:', error);
        await driver.takeScreenshot().then((image) => {
            require('fs').writeFileSync('error-screenshot.png', image, 'base64');
            console.log('Screenshot saved as error-screenshot.png');
        });
        throw error;
    } finally {
        await driver.quit();
    }
}

// Execute the test
testMessageSendingFlow().catch(console.error);