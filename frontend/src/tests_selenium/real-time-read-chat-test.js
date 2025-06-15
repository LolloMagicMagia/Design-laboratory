const { Builder, By, until } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");
const assert = require("assert");

async function realTimeMessageTest() {
    const options = new chrome.Options();
    options.addArguments("--headless=new");
    options.addArguments("--disable-gpu");
    options.addArguments("--window-size=1920,1080");
    options.addArguments("--incognito");
    const driver1 = await new Builder().forBrowser("chrome").setChromeOptions(options).build();
    const driver2 = await new Builder().forBrowser("chrome").setChromeOptions(options).build();

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const testMessage = `Messaggio in real time ✓✓ alle  ${timestamp}`;

    try {
        // 1. Login Marco Sossi nel primo browser
        await driver1.get("http://localhost:3000/login");
        await driver1.findElement(By.id("email")).sendKeys("gherardi200011@gmail.com");
        await driver1.findElement(By.id("password")).sendKeys("123456");
        await driver1.findElement(By.id("login-button")).click();
        await driver1.wait(until.urlIs("http://localhost:3000/"), 1000);
        console.log("✅ Log in Marco Sossi");

        // 2. Login Catal Kuz nel secondo browser
        await driver2.get("http://localhost:3000/login");
        await driver2.findElement(By.id("email")).sendKeys("teo2122@gmail.com");
        await driver2.findElement(By.id("password")).sendKeys("123456");
        await driver2.findElement(By.id("login-button")).click();
        await driver2.wait(until.urlIs("http://localhost:3000/"), 1000);
        console.log("✅ Log in Catal Kuz");

        // 3. Wait for the home page to load and click on the chat with Marco Sossi
        const chatElementMarco = await driver1.wait(
            until.elementLocated(By.css("[data-testid=\"chat-Catal-Kuz\"]")),
            10000
        );
        await chatElementMarco.click();
        console.log("✅ Chat with Catal Kuz open");
        await driver1.sleep(1000);

        // 3. Wait for the home page to load and click on the chat with Catal Kuz
        const chatElementCatal = await driver2.wait(
            until.elementLocated(By.css("[data-testid=\"chat-Marco-Sossi\"]")),
            10000
        );
        await chatElementCatal.click();
        console.log("✅ Chat with Marco Sossi open");
        await driver2.sleep(1000);

        // 4. Sending the message by Marco (driver1)
        const input1 = await driver1.findElement(By.css(".message-input"));
        await input1.sendKeys(testMessage);
        await driver1.findElement(By.id("message-send-button")).click();
        console.log("✅ Messaggio inviato:", testMessage);

        // 6. Verifica che il messaggio sia visibile in tempo reale sul driver2
        const receivedMessage = await driver2.wait(
            until.elementLocated(By.xpath(`//p[contains(text(), "${testMessage}")]`)),
            10000
        );
        assert.ok(receivedMessage, "Messaggio non ricevuto in tempo reale da Luigi");
        console.log("✅ Messaggio ricevuto in tempo reale sulla seconda finestra");

        // 7. Attendi che driver2 abbia attivato la lettura visibile
        await driver2.sleep(1500); // Tempo per triggerare il markChatAsRead nel client

        // 8. Verifica ✓✓ sul messaggio visibile nel driver1
        const last_text_chat_selector = By.xpath(`//p[contains(text(), "${testMessage}")]`);
        const last_text_chat = await driver1.findElement(last_text_chat_selector);

        console.log("✅ Find the element in the chat");

        const parentElement_chat = await last_text_chat.findElement(By.xpath("..")); // Va al padre immediato
        const statusSpan = await parentElement_chat.findElement(
            By.xpath("//span[@title=\"Read\"]")
        );
        const statusTitle = await statusSpan.getAttribute("title");
        assert.strictEqual(statusTitle, "Read", "The message should be marked as 'Read'");

        console.log("✅ Tick ✓✓ visible in chat: the message has been read");

    } catch (err) {
        console.error("❌ Errore nel test di messaggistica in tempo reale:", err);
        throw err;
    } finally {
        await driver1.quit();
        await driver2.quit();
    }
}

module.exports = realTimeMessageTest;
