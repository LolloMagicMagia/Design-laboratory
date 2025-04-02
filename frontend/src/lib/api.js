import DataService from './DataService';

const API = {
    getCurrentUser: () => DataService.getCurrentUser(),

    getChatsWithResolvedNames: async () => {
        const chats = await DataService.getChats();
        const currentUser = await DataService.getCurrentUser();
        const usersMap = DataService.data.users;

        return Object.entries(chats).map(([chatId, meta]) => {
            const chatData = DataService.data.chats[chatId];
            if (!chatData) return null;

            const senderId = meta.lastUser;
            const senderName = usersMap?.[senderId]?.username || "Utente";

            return {
                id: chatId,
                ...chatData,
                name: meta.name,
                lastMessage: {
                    content: meta.lastMessage,
                    sender: senderId,
                    senderName,
                    timestamp: meta.timestamp,
                    read: chatData.lastMessage?.read ?? false
                },
                unreadCount: meta.unreadCount
            };
        }).filter(Boolean);
    },

    getChats: () => DataService.getChats(),

    getChatById: (chatId) => DataService.getChatById(chatId),

    getMessagesByChatId: (chatId) => DataService.getMessagesByChatId(chatId),

    sendMessage: (chatId, content, sender) => DataService.sendMessage(chatId, content, sender),

    markChatAsRead: (chatId) => DataService.markChatAsRead(chatId),

    getUserById: (userId) => DataService.getUserById(userId),

    getFriendsList: () => DataService.getFriendsList(),

    exportData: () => DataService.exportData()
};

export default API;
