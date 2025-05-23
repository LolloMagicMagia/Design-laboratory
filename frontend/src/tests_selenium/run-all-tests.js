(async () => {
    try {
        console.log("\n🧪 Login Test...");
        await require("./login-test")();

        console.log("\n✉️ Send Message Test...");
       await require("./send-message-test")();

        console.log("\n🔔 Read Badge Test...");
        await require("./read-message-test")();

        console.log("\n📡 Check Read Status Test...");
        await require("./check-read-status-test")();

        console.log("\n📡 Check Read Status Test...");
        await require("./check-read-status-test")();

        console.log("\n📡 Real Time Read Test...");
       await require("./real-time-read-chat-test")();

        console.log("\n📡 Check New chat/ Remove Chat/ Hide Chat...");
        await require("./check-NRH-chat")();

        console.log("\n✅ Tutti i test Selenium completati con successo.");
    } catch (error) {
        console.error("\n❌ Errore durante i test Selenium:", error);
        process.exit(1);
    }
})();
