/**
 * API Module for handling user authentication, chat, messaging, and friendship features.
 * This module acts as the interface between the frontend application and the backend server.
 * It includes HTTP requests for user data, chat management, message handling, WebSocket subscriptions,
 * and social features like friends and group chat roles.
 *
 * @module frontend/src/lib/api.js
 */

import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";

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

    /**
     * Fetches the currently logged-in user's full profile from the backend.
     *
     * @function getCurrentUser
     * @returns {Promise<Object|null>} The user object if found, otherwise null.
     */
    getCurrentUser: async () => {
        const currentUserId = localStorage.getItem("currentUserId");

        if (!currentUserId) {
            console.log("Cancellation, User ID not found");
            return null;
        }

        try {
            // Make an HTTP request to get user data from the backend
            const res = await fetch(`http://localhost:8080/api/users/${currentUserId}`);

            if (!res.ok) {
                throw new Error("Error retrieving user data.");
            }

            let userData = await res.json();
            userData.user.id = currentUserId;
            const userDataFinal = userData.user;
            console.log("qui", userDataFinal);

            return {
                id: currentUserId,
                ...userDataFinal
            };

        } catch (error) {
            console.error("Error requesting user data:", error);
            return null;
        }
    },

    /**
     * Marks a specified chat as read for the current user.
     *
     * @function markChatAsRead
     * @async
     * @param {string} chatId - The ID of the chat to be marked as read.
     * @returns {Promise<void>}
     */
    markChatAsRead: async (chatId) => {
        const currentUserId = localStorage.getItem("currentUserId");
        if (!currentUserId) throw new Error("User not authenticated");

        try {
            await fetch(`${API_BASE}/api/users/markChatAsRead/${chatId}`, {
                method: "PUT",
            });
        } catch (err) {
            console.error("Error marking chat as read:", err);
        }
    },


    /**
     * Establishes a WebSocket connection with optional update listeners.
     * Subscribes to /topic/users, /topic/chats for real-time updates.
     * @function createWebSocketClient
     * @param {function} [onUsersUpdate] - Callback for user updates.
     * @param {function} [onChatsUpdate] - Callback for chat updates.
     * @param {function} [onMessagesUpdate] - Callback for message updates.
     * @returns {Client} STOMP WebSocket client instance.
     */
    createWebSocketClient: (onUsersUpdate = false, onChatsUpdate = false, onMessagesUpdate = false) => {
        const socket = new SockJS(`${API_BASE}/ws`);
        const client = new Client({
            webSocketFactory: () => socket,
            reconnectDelay: 5000,
            debug: () => {},
        });

        client.onConnect = () => {
            console.log("✅ WebSocket connected!");

            if (onUsersUpdate) {
                client.subscribe("/topic/users", (message) => {
                    let usersData = JSON.parse(message.body);
                    if (Array.isArray(usersData)) {
                        usersData = Object.fromEntries(usersData.map((u) => [u.id, u]));
                    }
                    onUsersUpdate(usersData);
                });
            }

            if (onChatsUpdate) {
                client.subscribe("/topic/chats", (message) => {
                    try {
                        const chatsData = JSON.parse(message.body);
                        onChatsUpdate(chatsData);
                    } catch (e) {
                        console.warn("⚠️ Errore parsing chats:", e);
                    }
                });
            }

            if (onMessagesUpdate) {
                client.subscribe("/topic/chats", (message) => {
                    try {
                        const raw = JSON.parse(message.body);

                        // ✅ Ignora messaggi che non sono array
                        if (!Array.isArray(raw)) {
                            console.warn("⏭️ Message ignored in onMessagesUpdate: not an array");
                            return;
                        }

                        const normalizedMessages = raw.flatMap((chatEntry) => {
                            const chatId = chatEntry.id;
                            const messages = chatEntry.chat?.messages || {};

                            return Object.entries(messages).map(([messageId, msg]) => ({
                                id: messageId,
                                chatId: chatId,
                                content: msg.content,
                                sender: msg.sender,
                                timestamp: msg.timestamp,
                                read: msg.read,
                            }));
                        });

                        onMessagesUpdate(normalizedMessages);
                    } catch (err) {
                        console.error("❌ WebSocket parsing error:", err);
                    }
                });
            }

        };

        return client;
    },


    /**
     * Retrieves a chat by its ID.
     * @function getChatById
     * @param {string} chatId - The ID of the chat to retrieve.
     * @returns {Promise<Object>} The chat object.
     */
    getChatById: (chatId) => {
        return fetch(`${API_BASE}/api/chats/${chatId}`).then((res) => res.json());
    },

    /**
     * Retrieves all the messages by its chatId
     * @function getMessagesByChatId
     * @param {string} chatId - The ID of the chat to retrieve.
     * @returns {Promise<Object>} The chat object.
     */
    getMessagesByChatId: (chatId) => {
        return fetch(`${API_BASE}/api/messages/${chatId}`).then((res) => res.json());
    },

    /**
     * Retrieves a user by their unique ID.
     * @function getUserById
     * @param {string} userId - The ID of the user to retrieve.
     * @returns {Promise<Object>} The user object.
     * @throws Will throw an error if the user is not found.
     */
    async getUserById(userId) {
        const res = await fetch(`http://localhost:8080/api/users/${userId}`);
        if (!res.ok) throw new Error("User not found");
        return await res.json();
    },

    /**
     * Sends a message to a chat.
     * @function sendMessage
     * @param {string} chatId - The ID of the chat.
     * @param {string} content - The textual content of the message.
     * @param {string} sender - The sender's user ID.
     * @param {string|null} image - Optional image in Base64 format.
     * @returns {Promise<Response>} The fetch response.
     */
    sendMessage: (chatId, content, sender, image = null) => {
        const payload = { content, sender };
        if (image) payload.image = image;

        return fetch(`/api/messages/${chatId}/send`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
    },

    /**
     * Updates the content of a specific message.
     * @function updateMessage
     * @param {string} chatId - The ID of the chat.
     * @param {string} messageId - The ID of the message.
     * @param {string} newContent - The new content of the message.
     * @returns {Promise<Response>} The fetch response.
     */
    updateMessage: (chatId, messageId, newContent) => {
        return fetch(`${API_BASE}/api/messages/${chatId}/update/${messageId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: newContent }),
        });
    },

    /**
     * Deletes a specific message from a chat.
     * @function deleteMessage
     * @param {string} chatId - The ID of the chat.
     * @param {string} messageId - The ID of the message to delete.
     * @returns {Promise<Response>} The fetch response.
     */
    deleteMessage: (chatId, messageId) => {
        return fetch(`${API_BASE}/api/messages/${chatId}/delete/${messageId}`, {
            method: "DELETE"
        });
    },

    /**
     * Retrieves the current user's list of friends.
     *
     * @function getFriendsList
     * @async
     * @returns {Promise<Object[]>} Array of friends.
     * @throws Will throw an error if the request fails.
     */
    async getFriendsList() {
        const uid = getCurrentUserId();
        console.log("👤 Current UID:", uid);
        const res = await fetch(`http://localhost:8080/api/friends/${uid}`);
        if (!res.ok) throw new Error("Error loading friends list");
        return await res.json();
    },

    /**
     * Sends a friend request to another user.
     * @function sendFriendRequest
     * @param {string} toUserId - The ID of the user to send a request to.
     * @returns {Promise<void>}
     * @throws Will throw an error if the request fails.
     */
    async sendFriendRequest(toUserId) {
        const fromUid = getCurrentUserId();
        const res = await fetch("http://localhost:8080/api/friends/request", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fromUid, toUid: toUserId }),
        });
        if (!res.ok) throw new Error("Error sending request");
    },

    /**
     * Retrieves all incoming friend requests for the current user.
     * @function getFriendRequestsList
     * @returns {Promise<Object[]>} Array of friend request objects.
     * @throws Will throw an error if the request fails.
     */
    async getFriendRequestsList() {
        const toUid = getCurrentUserId();
        const res = await fetch(`${API_BASE}/api/friends/requests/${toUid}`);
        if (!res.ok) throw new Error("Error loading friend requests");
        return await res.json();
    },

    /**
     * Accepts a friend request from another user.
     * @function acceptFriendRequest
     * @param {string} fromUid - The user ID of the sender of the request.
     * @returns {Promise<void>}
     * @throws Will throw an error if the request fails.
     */
    async acceptFriendRequest(fromUid) {
        const toUid = getCurrentUserId();
        const res = await fetch(`${API_BASE}/api/friends/accept`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fromUid, toUid }),
        });
        if (!res.ok) throw new Error("Error accepting request");
    },

    /**
     * Rejects a friend request from another user.
     * @function rejectFriendRequest
     * @param {string} fromUid - The user ID of the sender of the request.
     * @returns {Promise<void>}
     * @throws Will throw an error if the request fails.
     */
    async rejectFriendRequest(fromUid) {
        const toUid = getCurrentUserId();
        const res = await fetch(`${API_BASE}/api/friends/request`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fromUid, toUid }),
        });
        if (!res.ok) throw new Error("Error in request rejection");
    },

    /**
     * Creates an individual chat between two users if it does not already exist.
     * @function createIndividualChatIfNotExists
     * @param {string} receiverId - The ID of the recipient.
     * @param {string} initialMessage - Initial message content.
     * @returns {Promise<Object>} The newly created or existing chat object.
     * @throws Will throw an error if the creation fails.
     */
    async createIndividualChatIfNotExists(receiverId, initialMessage) {
        const senderId = localStorage.getItem("currentUserId");

        const res = await fetch("http://localhost:8080/api/chats/create-individual", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                senderId,
                receiverId,
                message: initialMessage,
            }),
        });

        if (!res.ok) {
            const error = await res.text();
            throw new Error("Chat creation error: " + error);
        }

        return await res.json();
    },

    /**
     * Retrieves all users to be displayed in the chat list.
     * @function getAllUsersForChatList
     * @returns {Promise<Object[]>} Array of user objects.
     * @throws Will throw an error if the request fails.
     */
    getAllUsersForChatList: async () => {
        const res = await fetch("http://localhost:8080/api/users/chatlist");
        if (!res.ok) throw new Error("Error loading users");
        return await res.json();
    },

    /**
     * Retrieves the current user's ID from localStorage.
     * @function getCurrentUserId
     * @returns {string} The user ID.
     */
    getCurrentUserId() {
        console.log(localStorage.getItem("currentUserId"));
        return localStorage.getItem("currentUserId");
    },

    /**
     * Updates the user's biography.
     * @function updateUserBio
     * @param {string} uid - The user ID.
     * @param {string} bio - The new biography text.
     * @returns {Promise<Response>} The fetch response.
     */
    updateUserBio: async (uid, bio) => {
        return fetch(`http://localhost:8080/api/users/${uid}/bio`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ bio }),
        });
    },


    /**
     * Updates the user's profile information including avatar, name, and surname.
     * @function updateUserProfile
     * @param {string} userId - The user ID.
     * @param {string} firstName - User's first name.
     * @param {string} lastName - User's last name.
     * @param {string|null} avatarBase64 - Optional avatar image in Base64.
     * @returns {Promise<string>} Response text from the server.
     * @throws Will throw an error if the update fails.
     */
    updateUserProfile: async (userId, firstName, lastName, avatarBase64) => {
        const formData = new URLSearchParams();
        formData.append("userId", userId);
        formData.append("firstName", firstName);
        formData.append("lastName", lastName);
        if (avatarBase64) {
            formData.append("avatar", avatarBase64);
        }

        const res = await fetch("http://localhost:8080/api/users/updateProfile", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: formData.toString(),
        });

        if (!res.ok) {
            const errorText = await res.text();
            throw new Error("Profile update error: " + errorText);
        }

        return res.text();
    },

    /**
     * Creates a group chat with the specified participants and initial message.
     * @function createGroupChat
     * @param {string[]} participants - Array of user IDs.
     * @param {string} creatorId - The user ID of the group creator.
     * @param {string} title - The title of the group chat.
     * @param {string} initialMessage - The first message to be sent.
     * @param {string|null} avatar - Optional avatar image in Base64.
     * @returns {Promise<void>}
     * @throws Will throw an error if the creation fails.
     */
    async createGroupChat(participants, creatorId, title, initialMessage, avatar = null) {
        const response = await fetch("http://localhost:8080/api/chats/createGroup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                participants,
                creatorId,
                title,
                initialMessage,
                avatar
            })
        });
        if (!response.ok) {
            throw new Error("Error creating group chat");
        }
    },

    /**
     * Updates the information of a group chat.
     * @function updateGroupInfo
     * @param {string} chatId - The ID of the chat.
     * @param {Object} data - Object containing updated info.
     * @param {string} data.title - New title.
     * @param {string} data.description - New description.
     * @param {string} data.avatar - Optional avatar in Base64.
     * @param {string} data.requesterId - User ID of the requester.
     * @returns {Promise<string>} Response text.
     * @throws Will throw an error if the update fails.
     */
    async updateGroupInfo(chatId, { title, description, avatar, requesterId }) {
        const response = await fetch(`http://localhost:8080/api/chats/${chatId}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                title,
                description,
                avatar,
                requesterId
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || "Error updating group");
        }

        return await response.text();
    },

    /**
     * Updates the role of a member within a group chat.
     * @function updateGroupRole
     * @param {string} chatId - The ID of the chat.
     * @param {Object} data - Role data to update.
     * @returns {Promise<void>}
     * @throws Will throw an error if the update fails.
     */
    updateGroupRole: async (chatId, data) => {
        const res = await fetch(`${API_BASE}/api/chats/${chatId}/role`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error(await res.text());
    },

    /**
     * Removes a user from a group chat.
     * @function removeUserFromGroup
     * @param {string} chatId - The chat ID.
     * @param {string} targetUserId - The ID of the user to remove.
     * @param {string} requesterId - The ID of the user requesting the removal.
     * @returns {Promise<void>}
     * @throws Will throw an error if the request fails.
     */
    removeUserFromGroup: async (chatId, targetUserId, requesterId) => {
        const res = await fetch(`${API_BASE}/api/chats/${chatId}/user/${targetUserId}?requesterId=${requesterId}`, {
            method: "DELETE",
        });
        if (!res.ok) throw new Error(await res.text());
    },

    /**
     * Deletes a group chat.
     * @function deleteGroup
     * @param {string} chatId - The ID of the group chat.
     * @param {string} requesterId - The ID of the user requesting deletion.
     * @returns {Promise<void>}
     * @throws Will throw an error if the deletion fails.
     */
    deleteGroup: async (chatId, requesterId) => {
        const res = await fetch(`${API_BASE}/api/chats/group/${chatId}?requesterId=${requesterId}`, {
            method: "DELETE",
        });
        if (!res.ok) throw new Error(await res.text());
    },

    /**
     * Adds a user to a group chat.
     * @function addUserToGroup
     * @param {string} chatId - The ID of the chat.
     * @param {string} userId - The ID of the user to add.
     * @param {string} requesterId - The ID of the requesting user.
     * @returns {Promise<void>}
     * @throws Will throw an error if the request fails.
     */
    addUserToGroup: async (chatId, userId, requesterId) => {
        const res = await fetch(`${API_BASE}/api/chats/${chatId}/add-user/${userId}?requesterId=${requesterId}`, {
            method: "POST"
        });

        if (!res.ok) {
            const text = await res.text();
            throw new Error(text);
        }
    },

    /**
     * Retrieves a specific message by its ID within a chat.
     * @function getMessageById
     * @param {string} chatId - The ID of the chat.
     * @param {string} messageId - The ID of the message.
     * @returns {Promise<Object>} The message object.
     * @throws Will throw an error if the retrieval fails.
     */
    async getMessageById(chatId, messageId) {
        const res = await fetch(`${API_BASE}/api/messages/${chatId}/messages/${messageId}`);
        if (!res.ok) throw new Error("Error loading updated message");
        return await res.json();
    },

    /**
     * Deletes an entire chat by its ID.
     * @function deleteChat
     * @param {string} chatId - The ID of the chat to delete.
     * @returns {Promise<void>}
     * @throws Will throw an error if the deletion fails.
     */
    async deleteChat(chatId) {
        const res = await fetch(`${API_BASE}/api/chats/${chatId}`, {
            method: "DELETE",
        });
        if (!res.ok) throw new Error("Error deleting chat");
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
        return res;
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
        return res;
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
