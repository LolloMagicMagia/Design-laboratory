const { Builder, By, until } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");
const assert = require("assert");

async function checkNRHchat() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const testMessage = `Messaggio test inviato alle ${timestamp}`;
    const error_message_chat = "You need to write a message to create the chat."

    const options = new chrome.Options();
    //options.addArguments("--headless=new");
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
        await driver.sleep(1000);

        // 2. Wait for the home page to load and click new chat
        await driver.findElement(By.id("new-chat-button")).click();
        console.log("✅ Selected new-chat menu'");
        await driver.sleep(1000);

        // 3. Click PescaMende TonLev
        await driver.findElement(By.id("user-j3fS558Os9MoRTy4iw5frqmRf8j1")).click();
        console.log("✅ Selected User'");

        // 4. Create Chat
        await driver.findElement(By.id("create-chat-button")).click();
        By.xpath(`//p[contains(text(), "${error_message_chat}")]`);
        console.log("✅ You need to input a first message");
        await driver.sleep(1000);

        const input = await driver.findElement(By.id("initialMessage"));
        await input.sendKeys(testMessage);

        await driver.findElement(By.id("create-chat-button")).click();
        console.log("✅ Message sent");

        await driver.sleep(1000);

        // 5. Check that the message appears in the chat list
        const chatElement = await driver.wait(
            until.elementLocated(By.css('[data-testid="chat-PescaMende-TonLev"]')),
            10000
        );

        const lastMessageElement = await chatElement.findElement(By.id("last-message"));

        const lastMessageText = await lastMessageElement.getText();
        console.log("📌 Found text of the message:", lastMessageText);

        if (lastMessageText.includes(testMessage)) {
            console.log("✅ The message corresponds");
        } else {
            console.error("❌ Error: The message not corresponds!");
        }

        console.log("✅ Appear message in chat-list");

        // 6. Hide the chat
        const chat_chatal = await driver.wait(
            until.elementLocated(By.css('[data-testid="chat-Catal-Kuz"]')),
            10000
        );
        await chat_chatal.findElement(By.id("hide-chat-button")).click();


        const pin_input_hide = await driver.findElement(By.id("hide-password"));
        await pin_input_hide.sendKeys('1234');
        await driver.findElement(By.id("confirm-HideChat")).click();
        await driver.findElement(By.id("hidden-chats-list")).click();


        const chatTitleElement = await driver.wait(
            until.elementLocated(By.xpath("//h3[contains(text(), 'Catal Kuz')]")),
            10000
        );
        const parentElement = await chatTitleElement.findElement(By.xpath("..")); // Va al padre immediato
        console.log("✅ Hide chat Chatal");

        await parentElement.findElement(By.id("make-it-visible")).click();
        const pin_input_unhide = await driver.findElement(By.id("unhide-password"));
        await pin_input_unhide.sendKeys('1234');
        await driver.findElement(By.id("unhide-button")).click();
        console.log("✅ Unhide chat chatal");

        // 6. Remove the chat
        await driver.findElement(By.id("all-chats")).click();
        await driver.sleep(1000);
        await driver.findElement(By.id("trash-button")).click();
        const alert = await driver.switchTo().alert();
        await alert.accept();
        await driver.sleep(1000);
        console.log("🎉 NRH completed");

    } catch (err) {
        console.error("❌ Error during testing:", err);
        throw err;
    } finally {
        await driver.quit();
    }
}

module.exports = checkNRHchat;
