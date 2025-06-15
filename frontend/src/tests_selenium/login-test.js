// login-test.js
const { Builder, By, until } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");
const assert = require("assert");

async function loginTest() {
    const options = new chrome.Options();
    options.addArguments("--headless=new");
    options.addArguments("--disable-gpu");
    options.addArguments("--window-size=1920,1080");

    const driver = await new Builder()
        .forBrowser("chrome")
        .setChromeOptions(options)
        .build();

    try {
        await driver.get("http://localhost:3000/login");
        await driver.wait(until.urlContains("/login"), 5000);
        console.log("✅ Open login page");

        await driver.findElement(By.id("email")).sendKeys("gherardi200011@gmail.com");
        await driver.findElement(By.id("password")).sendKeys("123456");
        console.log("✍️  Login details entered");

        await driver.findElement(By.id("login-button")).click();
        console.log("🔐 Login Started");

        await driver.wait(until.urlIs("http://localhost:3000/"), 10000);
        console.log("✅ Login completed and redirect performed");

        const currentUserId = await driver.executeScript("return localStorage.getItem(\"currentUserId\");");
        const currentUserEmail = await driver.executeScript("return localStorage.getItem(\"currentUserEmail\");");

        assert(currentUserId, "❌ currentUserId not found in localStorage");
        assert.strictEqual(currentUserEmail, "gherardi200011@gmail.com");
        console.log("✅ localStorage verified");
        console.log("🎉 Test Login completed successfully");

    } catch (error) {
        console.error("❌ Error during login test:", error);
        throw error;
    } finally {
        await driver.quit();
    }
}

// ✅ CHIAMATA DIRETTA ALLA FUNZIONE
module.exports = loginTest;
