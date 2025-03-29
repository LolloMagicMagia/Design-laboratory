const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const assert = require('assert');

async function testChatNavigation() {
    // 1. Browser configuration
    let options = new chrome.Options();
    options.addArguments([
        '--headless', // Remove this if you want to see it in action
        '--no-sandbox',
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--disable-dev-shm-usage',
        '--log-level=3' // Reduces Chrome logs
    ]);

    let driver = await new Builder()
        .forBrowser('chrome')
        .setChromeOptions(options)
        .build();

    try {
        // 2. Open the chat page
        await driver.get('http://localhost:3000'); // Modify if the URL is different

        // 3. Wait for elements to load
        await driver.wait(until.elementLocated(By.css('.chat-list-item')), 10000);

        // 4. Find all chat elements
        const chatItems = await driver.findElements(By.css('.chat-list-item'));
        assert(chatItems.length > 0, "No chats found");

        // 5. Test the first chat item
        const firstChat = chatItems[0];

        // Get chat name for debugging
        const chatName = await firstChat.findElement(By.css('.chat-name')).getText();
        console.log(`Testing chat: "${chatName}"`);

        // 6. Perform click
        await firstChat.click();

        // 7. Verify URL change
        await driver.wait(until.urlContains('/chat/'), 5000);

        // 8. Verify the chat page is loaded
        await driver.wait(until.elementLocated(By.css('.message-list')), 5000);

        console.log('✅ Test passed: Chat navigation works correctly');
    } catch (error) {
        console.error('❌ Test failed:', error);
        // Capture screenshot for debugging
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
testChatNavigation().catch(console.error);