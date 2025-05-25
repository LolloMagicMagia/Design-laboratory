const { Builder, By, until } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");
const assert = require("assert");

async function sendMessageTest() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const testMessage = `Messaggio test inviato alle ${timestamp}`;

    const options = new chrome.Options();
    options.addArguments("--headless=new");
    options.addArguments("--disable-gpu");
    options.addArguments("--window-size=1920,1080");

    const driver = await new Builder()
        .forBrowser("chrome")
        .setChromeOptions(options)
        .build();

    try {
        // 1. Login
        await driver.get("http://localhost:3000/login");
        await driver.findElement(By.id("email")).sendKeys("gherardi200011@gmail.com");
        await driver.findElement(By.id("password")).sendKeys("123456");
        await driver.findElement(By.id("login-button")).click();

        // 2. Wait for the home page to load and click on the chat with Catal-Kuz
        const chatElement = await driver.wait(
            until.elementLocated(By.css("[data-testid=\"chat-Catal-Kuz\"]")),
            10000
        );
        await chatElement.click();
        console.log("✅ Chat with Catal Kuz open");

        // 3. Wait for the message input area to load
        await driver.wait(until.elementLocated(By.id("message-input-form")), 10000);

        const input = await driver.findElement(By.id("message-input"));
        await input.sendKeys(testMessage);

        const sendButton = await driver.findElement(By.id("message-send-button"));
        await sendButton.click();
        console.log("✅ Message sent");

        // 4. Check that the message appears in the message list
        const messageSelector = By.xpath(`//p[contains(text(), "${testMessage}")]`);
        await driver.wait(until.elementLocated(messageSelector), 10000);
        console.log("✅ Appears in messages");

        // 5. Check the ✓ tick next to the time
        const messageElement = await driver.findElement(messageSelector);
        //const messageHTML = await messageElement.getAttribute("outerHTML");
        //console.log("HTML dell'elemento:", messageHTML);
        const parentElement = await messageElement.findElement(By.xpath("..")); // Va al padre immediato
        //const parentHTML = await parentElement.getAttribute("outerHTML");
        //console.log("📌 HTML del padre:", parentHTML);
        const statusSpan = await parentElement.findElement(
            By.xpath("//span[@title=\"Delivered\"]")
        );
        const statusTitle = await statusSpan.getAttribute("title");
        assert.strictEqual(statusTitle, "Delivered", "The message should be marked as 'Delivered'");
        console.log("✅ Message displayed with ✓ single");

        // 6. Return to the home screen
        const backButton = await driver.findElement(By.id("back-button"));
        await backButton.click();
        await driver.wait(until.urlIs("http://localhost:3000/"), 5000);
        console.log("✅ Return to the home page");

        // 7. Check that the conversation with Louis Smith shows the message, the ✓, and the badge
        const readStatus = await driver.wait(
            until.elementLocated(By.id("read-status-8YLOur8yNuPFBEYabrqbKx16Grs2_bQWe6y1TE6UO85TpiXsWVx8ID353")),
            3000
        );
        const statusText2 = await readStatus.getText();
        assert.strictEqual(statusText2, "✓", "There should be only one ✓ in the preview as well");

        console.log("🎉 Send message completed");

    } catch (err) {
        console.error("❌ Error during testing:", err);
        throw err;
    } finally {
        await driver.quit();
    }
}

module.exports = sendMessageTest;
