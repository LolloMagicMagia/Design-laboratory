
const API = {
  // Funzioni per le chat
  getChats: async () => {
    try {
      const response = await fetch("/api/chats");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Errore nel recupero delle chat");
      }

      return data.chats;
    } catch (error) {
      console.error("Errore durante il recupero delle chat:", error);
      throw error;
    }
  },

  getChatById: async (chatId) => {
    try {
      const response = await fetch(`/api/chats/${chatId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Errore nel recupero della chat");
      }

      return data.chat;
    } catch (error) {
      console.error(`Errore durante il recupero della chat ${chatId}:`, error);
      throw error;
    }
  },

  createChat: async (chatData) => {
    try {
      const response = await fetch("/api/chats", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(chatData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Errore nella creazione della chat");
      }

      return data.chat;
    } catch (error) {
      console.error("Errore durante la creazione della chat:", error);
      throw error;
    }
  },

  markChatAsRead: async (chatId) => {
    try {
      const response = await fetch(`/api/chats/${chatId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ markAsRead: true }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Errore nel segnare la chat come letta");
      }

      return data.success;
    } catch (error) {
      console.error(`Errore durante l'aggiornamento della chat ${chatId}:`, error);
      throw error;
    }
  },

  // Funzioni per i messaggi
  getMessagesByChatId: async (chatId) => {
    try {
      const response = await fetch(`/api/chats/${chatId}/messages`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Errore nel recupero dei messaggi");
      }

      return data.messages;
    } catch (error) {
      console.error(`Errore durante il recupero dei messaggi per la chat ${chatId}:`, error);
      throw error;
    }
  },

  sendMessage: async (chatId, content, sender = "currentUser") => {
    try {
      const response = await fetch(`/api/chats/${chatId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content, sender }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Errore nell'invio del messaggio");
      }

      return data.message;
    } catch (error) {
      console.error(`Errore durante l'invio del messaggio alla chat ${chatId}:`, error);
      throw error;
    }
  },

  // Funzioni per gli utenti
  getUserById: async (userId) => {
    try {
      const response = await fetch(`/api/users/${userId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Errore nel recupero dell'utente");
      }

      return data.user;
    } catch (error) {
      console.error(`Errore durante il recupero dell'utente ${userId}:`, error);
      throw error;
    }
  },

  getCurrentUser: async () => {
    try {
      const response = await fetch("/api/users/current");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Errore nel recupero dell'utente corrente");
      }

      return data.user;
    } catch (error) {
      console.error("Errore durante il recupero dell'utente corrente:", error);
      throw error;
    }
  }
};

export default API;