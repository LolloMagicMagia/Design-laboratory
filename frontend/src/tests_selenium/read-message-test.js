const { Builder, By, until } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");
const assert = require("assert");

async function readMessageTest() {
    const options = new chrome.Options();
    options.setUserPreferences({
        "credentials_enable_service": false,
        "profile.password_manager_enabled": false,
        "profile.default_content_setting_values.notifications": 2, // blocca notifiche
    });

    options.addArguments("--headless=new"); // Nuova modalità headless
    options.addArguments("--disable-gpu");  // Utile su Windows
    options.addArguments("--window-size=1920,1080"); // Facoltativo
    options.addArguments("--disable-infobars");
    options.addArguments("--disable-notifications");
    options.addArguments("--disable-popup-blocking");
    options.addArguments("--start-maximized");
    options.addArguments("--incognito");

    const driver = await new Builder()
        .forBrowser("chrome")
        .setChromeOptions(options)
        .build();

    try {
        // 1. Login
        await driver.get("http://localhost:3000/login");
        await driver.findElement(By.id("email")).sendKeys("teo2122@gmail.com");
        await driver.findElement(By.id("password")).sendKeys("123456");
        await driver.findElement(By.id("login-button")).click();
        console.log("✅ Log in Catal Kuz");

        try {
            const warningPopup = await driver.findElement(By.css("div[role=\"dialog\"]"));
            const okButton = await warningPopup.findElement(By.css("button"));
            await okButton.click();
            console.log("✅ pop-up found and closed");
            await driver.sleep(500); // aspetta che si chiuda
        } catch (e) {
            console.log("ℹ️ No popup found");
        }

        // 2. Badge presence check next to Marco Ossisi's chat
        const readStatus = await driver.wait(
            until.elementLocated(By.id("read-status-8YLOur8yNuPFBEYabrqbKx16Grs2_bQWe6y1TE6UO85TpiXsWVx8ID353")),
            3000
        );

        const statusText = await readStatus.getText();
        const isNumber = /^\d+$/.test(statusText) || statusText === "9+";

        assert.ok(isNumber, "The badge must show a number (e.g. 1, 2... or 9+), not ✓");

        console.log("✅ Message received isNumber?", isNumber);

        // 3. Wait for the home page to load and click on the chat with Marco Sossi
        const chatElementMarco = await driver.wait(
            until.elementLocated(By.css("[data-testid=\"chat-Marco-Sossi\"]")),
            10000
        );
        await chatElementMarco.click();
        console.log("✅ Chat with Marco Sossi open");
        await driver.sleep(1000);

        // 4. Return to the home screen
        const backButton = await driver.findElement(By.id("back-button"));
        await backButton.click();
        await driver.wait(until.urlIs("http://localhost:3000/"), 5000);
        console.log("✅ Return to the home screen");

        // 5. Attendi che il badge scompaia
        const readStatusElements = await driver.findElements(By.id("read-status-8YLOur8yNuPFBEYabrqbKx16Grs2_bQWe6y1TE6UO85TpiXsWVx8ID353"));

        if (readStatusElements.length === 0) {
            console.log("✅ No 'read-status' badges present, all ok.");
        } else {
            const text = await readStatusElements[0].getText();
            console.warn(" ❌ Badge still present with text:", text);
        }

    } catch (err) {
        console.error(" ❌ Error in the read test: ", err);
        throw err;
    } finally {
        await driver.quit();
    }
}

module.exports = readMessageTest;
