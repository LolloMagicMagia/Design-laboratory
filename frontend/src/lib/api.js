import mockData from '../data/mock-data.json';

let data = JSON.parse(JSON.stringify(mockData)); // Deep copy to isolate mutations

const getCurrentUserId = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('currentUserId') || 'R3kLQzaBVnT1TFgQ0BCJN5v5R4p1';
  }
  return null;
};

const API = {
  // Restituisce i dati dell'utente corrente
  getCurrentUser: async () => {
    const currentUserId = getCurrentUserId();
    const user = data.users[currentUserId];
    return user ? { id: currentUserId, ...user } : null;
  },

  getChatsWithResolvedNames: async () => {
    const currentUserId = getCurrentUserId();
    const userData = data.users[currentUserId];
    const chatUser = userData?.chatUser || {};
    const usersMap = data.users;

    const chats = [];

    for (const [chatId, meta] of Object.entries(chatUser)) {
      const chatData = data.chats[chatId];
      if (!chatData) continue;

      const senderId = meta.lastUser;
      const senderName = usersMap?.[senderId]?.username || "Utente";

      const chat = {
        id: chatId,
        ...chatData,
        name: meta.name, // già risolto in chatUser
        lastMessage: {
          content: meta.lastMessage,
          sender: senderId,
          senderName, // aggiunto!
          timestamp: meta.timestamp,
          read: chatData.lastMessage?.read ?? false
        },
        unreadCount: meta.unreadCount
      };

      chats.push(chat);
    }

    return chats;
  },


  // Restituisce la lista di chat dell'utente corrente
  getChats: async () => {
    const currentUserId = getCurrentUserId();
    const userData = data.users[currentUserId];
    const chatUser = userData?.chatUser || {};
    const chats = [];

    for (const [chatId, meta] of Object.entries(chatUser)) {
      const chatData = data.chats[chatId];
      if (!chatData) continue;

      const chat = {
        id: chatId,
        ...chatData,
        name: meta.name,
        lastMessage: {
          content: meta.lastMessage,
          sender: meta.lastUser,
          timestamp: meta.timestamp,
          read: chatData.lastMessage?.read ?? false
        },
        unreadCount: meta.unreadCount
      };

      chats.push(chat);
    }

    return chats;
  },

  // Recupera i dettagli di una chat
  getChatById: async (chatId) => {
    const chat = data.chats[chatId];
    return chat ? { id: chatId, ...chat } : null;
  },

  // Recupera tutti i messaggi ordinati per timestamp
  getMessagesByChatId: async (chatId) => {
    const messagesObj = data.chats?.[chatId]?.messages || {};
    const messages = Object.entries(messagesObj).map(([id, msg]) => ({ id, ...msg }));
    return messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  },

  // Invia un messaggio
  sendMessage: async (chatId, content, sender = getCurrentUserId()) => {
    const timestamp = new Date().toISOString();
    const messageId = `msg_${Date.now()}`;

    const newMessage = {
      chatId,
      sender,
      content,
      timestamp,
      read: false
    };

    if (!data.chats[chatId].messages) {
      data.chats[chatId].messages = {};
    }

    data.chats[chatId].messages[messageId] = newMessage;

    // Aggiorna metadati per ogni partecipante (chatUser)
    const participants = data.chats[chatId].participants;
    for (const uid of participants) {
      const chatUserRef = data.users?.[uid]?.chatUser?.[chatId];
      if (!chatUserRef) continue;

      chatUserRef.lastMessage = content;
      chatUserRef.lastUser = sender;
      chatUserRef.timestamp = timestamp;

      if (uid !== sender) {
        chatUserRef.unreadCount = (chatUserRef.unreadCount || 0) + 1;
      } else {
        chatUserRef.unreadCount = 0;
      }
    }

    return { id: messageId, ...newMessage };
  },

  // Marca una chat come letta per l'utente corrente
  markChatAsRead: async (chatId) => {
    const currentUserId = getCurrentUserId();
    const chatUserRef = data.users?.[currentUserId]?.chatUser?.[chatId];

    if (chatUserRef) {
      chatUserRef.unreadCount = 0;

      const lastMsg = data.chats?.[chatId]?.messages;
      const lastKey = Object.keys(lastMsg || {}).pop();
      if (lastMsg?.[lastKey]) {
        lastMsg[lastKey].read = true;
      }
    }
  },

  // Recupera utente per ID
  getUserById: async (userId) => {
    const user = data.users[userId];
    return user ? { id: userId, ...user } : null;
  },

  // Esporta lo stato attuale (per debug o salvataggio mock)
  exportData: () => JSON.stringify(data, null, 2)
};

export default API;
