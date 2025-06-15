const { Builder, By, until } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");
const assert = require("assert");

async function checkReadStatusTest() {
    const options = new chrome.Options();
    options.addArguments("--headless=new"); // Nuova modalità headless
    options.addArguments("--disable-gpu");  // Utile su Windows
    options.addArguments("--window-size=1920,1080"); // Facoltativo
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

        // 2. Check for the double tick on the homepage
        const readStatus = await driver.wait(
            until.elementLocated(By.id("read-status-8YLOur8yNuPFBEYabrqbKx16Grs2_bQWe6y1TE6UO85TpiXsWVx8ID353")),
            3000
        );

        const parentElement = await readStatus.findElement(By.xpath("../.."));
        //const parentHTML = await parentElement.getAttribute("outerHTML");
        //console.log("📌 HTML del padre:\n", parentHTML);

        const last_text  = await parentElement.findElement(
            By.id("last-message")
        );

        const lastMessageText = await last_text.getText();
        console.log("📌 Testo del messaggio:", lastMessageText);

        // 3. Wait for the home page to load and click on the chat with Luigi Bianchi
        const chatElement = await driver.wait(
            until.elementLocated(By.css("[data-testid=\"chat-Catal-Kuz\"]")),
            10000
        );
        await chatElement.click();
        console.log("✅ Chat with Catal Kuz open");

        // 4. Check that the message has a double tick (✓✓) in the chat
        await driver.sleep(1000);
        const last_text_chat_selector = By.xpath(`//p[contains(text(), "${lastMessageText}")]`);
        const last_text_chat = await driver.findElement(last_text_chat_selector);

        console.log("✅ Find the element in the chat");

        const parentElement_chat = await last_text_chat.findElement(By.xpath("..")); // Va al padre immediato
        const statusSpan = await parentElement_chat.findElement(
            By.xpath("//span[@title=\"Read\"]")
        );
        const statusTitle = await statusSpan.getAttribute("title");
        assert.strictEqual(statusTitle, "Read", "The message should be marked as 'Read'");

        console.log("✅ Tick ✓✓ visible in chat: the message has been read");

    } catch (err) {
        console.error("❌ Error in the double tick test:", err);
        throw err;
    } finally {
        await driver.quit();
    }
}

module.exports = checkReadStatusTest;
