import DataService from "./DataService";

const API_BASE = "http://localhost:8080";

/**
 * Retrieves the current user's ID from localStorage.
 * @returns {string|null} The user ID if found, otherwise null.
 */
function getCurrentUserId() {
    console.log(localStorage.getItem("currentUserId"));
    return localStorage.getItem("currentUserId");
}

const API = {

    getCurrentUser: () => DataService.getCurrentUser(),

    //Post per cambiare dati
    markChatAsRead: (chatId) => {
        return DataService.markChatAsRead(chatId);
    },

    getChatById: (chatId) => DataService.getChatById(chatId),

    getMessagesByChatId: (chatId) => DataService.getMessagesByChatId(chatId),

    sendMessage: (chatId, content, sender) => DataService.sendMessage(chatId, content, sender),

    getUserById: (userId) => DataService.getUserById(userId),

    getFriendsList: () => DataService.getFriendsList(),

    //Post per cambiare dati
    createIndividualChatIfNotExists: (friendId, message) => {
        return DataService.createIndividualChatIfNotExists(friendId, message);
    },

    /**
     * Hides a chat with a protection PIN. The chat will be moved to the hidden chats section
     * and will require the PIN to be accessed again.
     *
     * @function hideChat
     * @param {string} chatId - The ID of the chat to be hidden.
     * @param {string} pin - The security PIN to protect the chat.
     * @returns {Promise<Object>} Response data from the server.
     * @throws Will throw an error if the chat hiding process fails.
     */
    async hideChat(chatId, pin) {
        const userId = getCurrentUserId();
        const res = await fetch(`/api/chats/${chatId}/hide?userId=${userId}&pin=${pin}`, { method: "POST" });
        if (!res.ok) throw new Error("Error while hiding chat");
        return res
    },

    /**
     * Unhides a previously hidden chat, making it visible in the regular chats list again.
     *
     * @function unhideChat
     * @param {string} chatId - The ID of the chat to be unhidden.
     * @returns {Promise<Object>} Response data from the server.
     * @throws Will throw an error if the chat unhiding process fails.
     */
    async unhideChat(chatId) {
        const userId = getCurrentUserId();
        const res = await fetch(`/api/chats/${chatId}/unhide?userId=${userId}`, { method: "POST" });
        if (!res.ok) throw new Error("Error while unhiding chat");
        return res
    },

    /**
     * Verifies if the provided PIN matches the one used to protect a hidden chat.
     * This is required to access the content of a hidden chat.
     *
     * @function verifyPin
     * @param {string} chatId - The ID of the hidden chat.
     * @param {string} pin - The PIN to verify.
     * @returns {Promise<Object>} Response containing the verification result.
     * @throws Will throw an error if the PIN verification process fails.
     */
    async verifyPin(chatId, pin) {
        const userId = getCurrentUserId();
        const res = await fetch(`/api/chats/${chatId}/verify-pin?userId=${userId}&pin=${pin}`);
        if (!res.ok) throw new Error("Error while verifying the pin");
        return res.json();
    },
};

export default API;
