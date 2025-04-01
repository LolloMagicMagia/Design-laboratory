// src/app/chat/[id]/page.jsx
"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import API from "@/lib/api";

/**
 * Chat Page Component - Dynamic route for individual chat view.
 * @module frontend/page/src/app/chat/id/page.jsx
 * @param {Object} params - Route parameters object.
 * @param {string} params.id - The unique identifier of the chat.
 * @description Displays a specific chat conversation with its messages and provides message sending functionality.
 * @example
 * // Route: /chat/123
 * <ChatPage params={{ id: "123" }} />
 */
export default function ChatPage({ params }) {
  /**
   * The chat ID extracted from route parameters.
   * @type {string}
   */
  const chatId = params.id;

  /**
   * State for storing chat details.
   * @type {Object|null}
   */
  const [chat, setChat] = useState(null);

  /**
   * State for storing chat messages.
   * @type {Array<Object>}
   */
  const [messages, setMessages] = useState([]);

  /**
   * State for the new message input.
   * @type {string}
   */
  const [newMessage, setNewMessage] = useState("");

  /**
   * State for loading status.
   * @type {boolean}
   */
  const [loading, setLoading] = useState(true);

  /**
   * State for message sending status.
   * @type {boolean}
   */
  const [sendingMessage, setSendingMessage] = useState(false);

  /**
   * State for error messages.
   * @type {string|null}
   */
  const [error, setError] = useState(null);

  /**
   * Reference for auto-scrolling to the latest message.
   * @type {React.RefObject<HTMLDivElement>}
   */
  const messagesEndRef = useRef(null);

  const router = useRouter();

  /**
   * Fetches initial chat data and sets up message polling.
   * @async
   * @function
   * @returns {void}
   */
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get chat details
        const chatData = await API.getChatById(chatId);
        setChat(chatData);

        // Mark chat as read
        await API.markChatAsRead(chatId);

        // Get chat messages
        const messagesData = await API.getMessagesByChatId(chatId);
        setMessages(messagesData);

        setLoading(false);
      } catch (err) {
        console.error("Error loading chat data:", err);
        setError("Failed to load chat. Please try again later.");
        setLoading(false);
      }
    };

    fetchData();

    // Set up polling for new messages
    const interval = setInterval(async () => {
      try {
        const updatedMessages = await API.getMessagesByChatId(chatId);
        if (JSON.stringify(updatedMessages) !== JSON.stringify(messages)) {
          setMessages(updatedMessages);
        }
      } catch (err) {
        console.error("Error updating messages:", err);
      }
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, [chatId]);

  /**
   * Auto-scrolls to the latest message when messages change.
   * @function
   * @returns {void}
   */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /**
   * Handles sending a new message.
   * @async
   * @function handleSendMessage
   * @param {Event} e - The form submit event.
   * @returns {Promise<void>}
   */
  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!newMessage.trim()) return;

    try {
      setSendingMessage(true);

      // Send the message
      await API.sendMessage(chatId, newMessage.trim());

      // Refresh messages
      const updatedMessages = await API.getMessagesByChatId(chatId);
      setMessages(updatedMessages);

      // Reset input
      setNewMessage("");
      setSendingMessage(false);
    } catch (err) {
      console.error("Error sending message:", err);
      setError("Failed to send message. Please try again later.");
      setSendingMessage(false);
    }
  };

  /**
   * Formats message timestamp to time string.
   * @function formatMessageTime
   * @param {string|number} timestamp - The message timestamp.
   * @returns {string} Formatted time string.
   */
  const formatMessageTime = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  /**
   * Formats message timestamp to relative date string.
   * @function formatMessageDate
   * @param {string|number} timestamp - The message timestamp.
   * @returns {string} Formatted date string ("Today", "Yesterday", or full date).
   */
  const formatMessageDate = (timestamp) => {
    if (!timestamp) return "";

    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString();
    }
  };

  /**
   * Groups messages by date.
   * @function groupMessagesByDate
   * @returns {Array<Object>} Array of message groups with date information.
   */
  const groupMessagesByDate = () => {
    const groups = {};

    messages.forEach(message => {
      const date = message.timestamp ? new Date(message.timestamp) : new Date();
      const dateString = date.toDateString();

      if (!groups[dateString]) {
        groups[dateString] = [];
      }

      groups[dateString].push(message);
    });

    return Object.entries(groups).map(([date, msgs]) => ({
      date,
      messages: msgs,
      formattedDate: formatMessageDate(date)
    }));
  };

  /**
   * Gets the other participant's ID in a one-to-one chat.
   * @function getOtherParticipantId
   * @returns {string|null} The other participant's ID or null if not applicable.
   */
  const getOtherParticipantId = () => {
    if (!chat || chat.type !== "individual") return null;
    return chat.participants.find(id => id !== "currentUser");
  };

  if (loading) {
    return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-xl font-semibold">Loading...</div>
        </div>
    );
  }

  if (error) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
          <div className="text-red-500 mb-4">{error}</div>
          <button
              onClick={() => window.location.reload()}
              className="btn btn-primary"
          >
            Try Again
          </button>
        </div>
    );
  }

  if (!chat) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
          <div className="text-red-500 mb-4">Chat not found</div>
          <Link
              href="/"
              className="btn btn-primary"
          >
            Back to chat list
          </Link>
        </div>
    );
  }

  const messageGroups = groupMessagesByDate();
  const otherParticipantId = getOtherParticipantId();

  return (
      <div className="page-container">
        {/* Header */}
        <header className="page-header">
          <div className="container mx-auto flex items-center">
            <button
                onClick={() => router.push("/")}
                className="btn btn-icon"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div className="flex items-center ml-3">
              <img
                  src="https://dummyimage.com/40x40/000/fff&text=M"
                  alt={chat.name}
                  className="user-avatar"
                  style={{ width: "40px", height: "40px" }}
              />
              <div className="ml-3">
                <h1 className="font-semibold">{chat.name}</h1>
                {chat.type === "group" ? (
                    <p className="text-xs text-gray-500">{chat.participants.length} participants</p>
                ) : (
                    <div className="user-status">
                      <span className="status-indicator status-online"></span>
                      <span>Online</span>
                    </div>
                )}
              </div>
            </div>

            {otherParticipantId && (
                <Link
                    href={`/user/${otherParticipantId}`}
                    className="btn btn-icon ml-auto"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </Link>
            )}
          </div>
        </header>

        {/* Main content - Messages */}
        <main className="page-content p-0">
          <div className="chat-container">
            <div className="message-list">
              {messageGroups.map(group => (
                  <div key={group.date} className="message-group">
                    {/* Date divider */}
                    <div className="message-date">
                  <span className="message-date-text">
                    {group.formattedDate}
                  </span>
                    </div>

                    {/* Messages for this date */}
                    <div className="space-y-3">
                      {group.messages.map(message => {
                        const isCurrentUser = message.sender === "currentUser";

                        return (
                            <div
                                key={message.id}
                                className={`message ${isCurrentUser ? "message-sent" : "message-received"}`}
                            >
                              {!isCurrentUser && chat.type === "group" && (
                                  <p className="text-xs font-semibold mb-1">
                                    {message.senderName || "User"}
                                  </p>
                              )}
                              <p>{message.content}</p>
                              <p className="message-time">
                                {formatMessageTime(message.timestamp)}
                                {isCurrentUser && (
                                    <span className="ml-1">
                              {message.read ? "✓✓" : "✓"}
                            </span>
                                )}
                              </p>
                            </div>
                        );
                      })}
                    </div>
                  </div>
              ))}

              {/* Dummy div for auto-scroll */}
              <div ref={messagesEndRef} />
            </div>

            {/* Message input */}
            <div className="message-input-container">
              <form onSubmit={handleSendMessage} className="message-input-form">
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="message-input"
                    disabled={sendingMessage}
                />
                <button
                    type="submit"
                    className="message-send-button"
                    disabled={!newMessage.trim() || sendingMessage}
                >
                  {sendingMessage ? (
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                  ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                  )}
                </button>
              </form>
            </div>
          </div>
        </main>
      </div>
  );
}