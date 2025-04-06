import DataService from "./DataService";

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
};

export default API;
