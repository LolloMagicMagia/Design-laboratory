import mockData from '../data/mock-data.json';

class DataService {
  constructor() {
    this.data = JSON.parse(JSON.stringify(mockData)); // Deep copy per evitare modifiche dirette
  }

  getCurrentUserId() {
    if (typeof window !== 'undefined') {
      return "R3kLQzaBVnT1TFgQ0BCJN5v5R4p1"; // Simulazione localStorage
    }
    return null;
  }

  async getCurrentUser() {
    const currentUserId = this.getCurrentUserId();
    return this.data.users[currentUserId] ? { id: currentUserId, ...this.data.users[currentUserId] } : null;
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
    const messageId = `msg_${Date.now()}`;

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

      if (uid !== sender) {
        chatUserRef.unreadCount = (chatUserRef.unreadCount || 0) + 1;
      } else {
        chatUserRef.unreadCount = 0;
      }
    }

    return { id: messageId, ...newMessage };
  }

  async markChatAsRead(chatId) {
    const currentUserId = this.getCurrentUserId();
    const chatUserRef = this.data.users?.[currentUserId]?.chatUser?.[chatId];

    if (chatUserRef) {
      chatUserRef.unreadCount = 0;

      const lastMsg = this.data.chats?.[chatId]?.messages;
      const lastKey = Object.keys(lastMsg || {}).pop();
      if (lastMsg?.[lastKey]) {
        lastMsg[lastKey].read = true;
      }
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

  exportData() {
    return JSON.stringify(this.data, null, 2);
  }
}

export default new DataService();
