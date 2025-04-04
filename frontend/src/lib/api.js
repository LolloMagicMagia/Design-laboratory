import DataService from './DataService';

const API = {
    getCurrentUser: () => DataService.getCurrentUser(),

    getChatsWithResolvedNames: () => DataService.getChatsWithResolvedNames(),

    getChats: () => DataService.getChats(),

    getChatById: (chatId) => DataService.getChatById(chatId),

    getMessagesByChatId: (chatId) => DataService.getMessagesByChatId(chatId),

    sendMessage: (chatId, content, sender) => DataService.sendMessage(chatId, content, sender),

    //Post per cambiare dati
    markChatAsRead: (chatId) => {
        return DataService.markChatAsRead(chatId);
    },

    //Post per cambiare dati
    createIndividualChatIfNotExists: (friendId, message) => {
        return DataService.createIndividualChatIfNotExists(friendId, message);
    },

    getUserById: (userId) => DataService.getUserById(userId),

    getFriendsList: () => DataService.getFriendsList(),

    exportData: () => DataService.exportData()
};

export default API;
