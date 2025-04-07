import mockData from "../data/mock-data.json";

class DataService {
  constructor() {
    this.data = JSON.parse(JSON.stringify(mockData)); // Deep copy per evitare modifiche dirette
  }

  // Andare a definire la logica con elio per prendere l'id
  getCurrentUserId() {
    return localStorage.getItem("currentUserId");
  }

  /*
  async getCurrentUser() {
    const currentUserId = this.getCurrentUserId();
    return this.data.users[currentUserId] ? { id: currentUserId, ...this.data.users[currentUserId] } : null;
  }
   */

  async getCurrentUser() {
    const currentUserId = this.getCurrentUserId();
    const email = localStorage.getItem("currentUserEmail");

    if (!this.data.users[currentUserId]) return null;

    return {
      id: currentUserId,
      email, // ✅ ora incluso
      ...this.data.users[currentUserId]
    };
  }

  async getUserById(userId) {
    return this.data.users[userId] ? { id: userId, ...this.data.users[userId] } : null;
  }

  async getChats() {
    const currentUserId = this.getCurrentUserId();
    const userData = this.data.users[currentUserId];
    return userData?.chatUser || {};
  }

  async getChatById(chatId) {
    return this.data.chats[chatId] ? { id: chatId, ...this.data.chats[chatId] } : null;
  }

  async getMessagesByChatId(chatId) {
    const messages = this.data.chats?.[chatId]?.messages || {};
    return Object.entries(messages).map(([id, msg]) => ({ id, ...msg })).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }

  async sendMessage(chatId, content, sender = this.getCurrentUserId()) {
    const timestamp = new Date().toISOString();
    const messageId = `msg${Date.now()}`;

    const newMessage = {
      chatId,
      sender,
      content,
      timestamp,
      read: false
    };

    if (!this.data.chats[chatId].messages) {
      this.data.chats[chatId].messages = {};
    }

    this.data.chats[chatId].messages[messageId] = newMessage;

    const participants = this.data.chats[chatId].participants;
    for (const uid of participants) {
      const chatUserRef = this.data.users?.[uid]?.chatUser?.[chatId];
      if (!chatUserRef) continue;

      chatUserRef.lastMessage = content;
      chatUserRef.lastUser = sender;
      chatUserRef.timestamp = timestamp;
      chatUserRef.unreadCount = (chatUserRef.unreadCount || 0) + 1;

    }

    return { id: messageId, ...newMessage };
  }

  async markChatAsRead(chatId) {
    try {
      const currentUserId = this.getCurrentUserId();
      if (!currentUserId) {
        throw new Error("Utente non autenticato");
      }

      // Controllo più rigoroso della struttura dati
      if (!this.data.users?.[currentUserId]?.chatUser?.[chatId]) {
        throw new Error(`Chat ${chatId} non trovata per l'utente corrente`);
      }

      // Ottieni gli utenti coinvolti nella chat
      const chat = this.data.chats[chatId];
      if (!chat) {
        throw new Error(`Chat ${chatId} non trovata`);
      }

      // Azzeramento del conteggio unreadCount per tutti gli utenti nella chat
      const usersInChat = chat.participants;

      usersInChat.forEach(userId => {
        const chatUserRef = this.data.users[userId]?.chatUser?.[chatId];
        if (chatUserRef) {
          chatUserRef.unreadCount = 0;  // Azzeramento del contatore
        }
      });

      // Controllo esistenza chat e messaggi
      if (!this.data.chats[chatId]) {
        console.warn(`Chat ${chatId} non trovata nella collezione chats`);
        return; // Potresti anche voler lanciare un errore qui
      }

      const chatMessages = this.data.chats[chatId].messages;

      if (chatMessages) {
        // Modifica più efficiente con Object.keys
        Object.keys(chatMessages).forEach(messageId => {
          if (!chatMessages[messageId].read) {
            chatMessages[messageId].read = true;
          }
        });

        console.debug(`Marcati come letti i messaggi per la chat ${chatId}`);
        return true; // Esplicito ritorno di successo
      }

      return false; // Indica che non c'erano messaggi da marcare
    } catch (error) {
      console.error(`Errore in markChatAsRead per la chat ${chatId}:`, error);
      throw error; // Rilancia per gestione nell'UI
    }
  }

  async getFriendsList() {
    const currentUserId = this.getCurrentUserId();
    const currentUser = this.data.users[currentUserId];
    if (!currentUser || !currentUser.friends) return [];

    return Object.entries(currentUser.friends).map(([friendId, details]) => ({
      id: friendId,
      username: this.data.users[friendId]?.username || "Sconosciuto",
      status: this.data.users[friendId]?.status || "offline",
      friendshipStatus: details.status,
      friendsSince: details.since
    }));
  }

  async createIndividualChatIfNotExists(friendId, message) {
    const currentUserId = this.getCurrentUserId();

    // Controlla se esiste già una chat individuale tra currentUser e friendId
    for (const [chatId, chat] of Object.entries(this.data.chats)) {
      if (
          chat.type === "individual" &&
          chat.participants.includes(currentUserId) &&
          chat.participants.includes(friendId)
      ) {
        return { alreadyExists: true, chatId };
      }
    }

    // Crea una nuova chat
    const chatId = `chat${Date.now()}`;
    const timestamp = new Date().toISOString();
    const name = this.data.users[friendId]?.username || "Nuova Chat";

    // Crea la chat nel nodo `chats` e aggiungi il messaggio iniziale
    this.data.chats[chatId] = {
      participants: [currentUserId, friendId],
      type: "individual",
      messages: {
        [`msg_${Date.now()}`]: {
          sender: currentUserId,
          content: message,
          timestamp,
          read: false,
        }
      },
    };

    // Aggiungi anche il messaggio nel campo `chatUser` per entrambi gli utenti
    for (const userId of [currentUserId, friendId]) {
      if (!this.data.users[userId].chatUser) {
        this.data.users[userId].chatUser = {};
      }
      this.data.users[userId].chatUser[chatId] = {
        name: this.data.users[userId === currentUserId ? friendId : currentUserId]?.username || "Chat",
        lastMessage: message,
        lastUser: currentUserId,
        timestamp,
        unreadCount: 1, // Il primo messaggio è non letto
      };
    }

    return { alreadyExists: false, chatId };
  }


  exportData() {
    return JSON.stringify(this.data, null, 2);
  }
}

export default new DataService();
