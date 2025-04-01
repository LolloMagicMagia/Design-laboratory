// src/app/page.js

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import API from "@/lib/api";

/**
 * Homepage - Route principale ("/").
 * @module frontend/page/src/app/page.jsx
 * @description Main page showing the list of chats.
 */
export default function Home() {
  /**
   * State for storing the list of chats.
   * @type {Array<Object>}
   */
  const [chats, setChats] = useState([]);

  /**
   * State for storing the current user's data.
   * @type {Object|null}
   */
  const [currentUser, setCurrentUser] = useState(null);

  /**
   * State to track loading status.
   * @type {boolean}
   */
  const [loading, setLoading] = useState(true);

  /**
   * State for storing error messages.
   * @type {string|null}
   */
  const [error, setError] = useState(null);

  const router = useRouter();

  /**
   * Fetches user data and chat list when component mounts.
   * @async
   * @function fetchData
   * @returns {Promise<void>}
   */
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get current user
        const user = await API.getCurrentUser();
        setCurrentUser(user);

        // Get all chats
        const fetchedChats = await API.getChats();
        setChats(fetchedChats);
        setLoading(false);
      } catch (err) {
        console.error("Error loading data:", err);
        setError("Failed to load chats. Please try again later.");
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  /**
   * Handles click on a chat item.
   * Marks chat as read and navigates to chat page.
   * @async
   * @function handleChatClick
   * @param {string} chatId - The ID of the chat to open
   * @returns {Promise<void>}
   */
  const handleChatClick = async (chatId) => {
    try {
      if (chatId) {
        await API.markChatAsRead(chatId);

        // Update chat state to reflect it's been read
        setChats(chats.map(chat =>
            chat.id === chatId
                ? { ...chat, unreadCount: 0, lastMessage: { ...chat.lastMessage, read: true } }
                : chat
        ));

        // Navigate to chat page
        router.push(`/chat/${chatId}`);
      }
    } catch (err) {
      console.error("Error opening chat:", err);
      setError("Failed to open chat. Please try again later.");
    }
  };

  /**
   * Formats a timestamp into a human-readable format.
   * @function formatTimestamp
   * @param {string|number} timestamp - The timestamp to format
   * @returns {string} Formatted date/time string
   */
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "";

    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    // Less than 24 hours ago: show time only
    if (diff < 24 * 60 * 60 * 1000) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }

    // Less than 7 days ago: show weekday
    if (diff < 7 * 24 * 60 * 60 * 1000) {
      return date.toLocaleDateString([], { weekday: "short" });
    }

    // Otherwise show full date
    return date.toLocaleDateString();
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
            Retry
          </button>
        </div>
    );
  }

  return (
      <div className="page-container">
        {/* Header */}
        <header className="page-header">
          <div className="container mx-auto flex justify-between items-center">
            <h1 className="text-xl font-bold">BicoChat</h1>
            {currentUser && (
                <Link href="/profile" className="flex items-center">
                  <img
                      src={currentUser.avatar || "https://dummyimage.com/40x40/000/fff&text=Boh?"}
                      alt={currentUser.name}
                      className="w-8 h-8 rounded-full mr-2"
                  />
                  <span>{currentUser.name}</span>
                </Link>
            )}
          </div>
        </header>

        {/* Main content */}
        <main className="page-content">
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-semibold">Your chats</h2>
            </div>

            <div>
              {chats.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    You don't have any active chats yet.
                  </div>
              ) : (
                  <div className="divide-y">
                    {chats.map(chat => (
                        <div
                            key={chat.id}
                            className={`chat-list-item ${chat.unreadCount > 0 ? "unread" : ""}`}
                            onClick={() => handleChatClick(chat.id)}
                        >
                          {/* Chat avatar */}
                          <div className="chat-avatar">
                            <img
                                src="https://dummyimage.com/48x48/000/fff&text=Generica?"
                                alt={chat.name}
                                className="chat-avatar-image"
                            />
                            {chat.type === "group" && (
                                <span className="chat-type-indicator">
                          G
                        </span>
                            )}
                          </div>

                          {/* Chat details */}
                          <div className="chat-info">
                            <div className="chat-header">
                              <h3 className="chat-name">{chat.name}</h3>
                              <span className="chat-time">
                          {chat.lastMessage && formatTimestamp(chat.lastMessage.timestamp)}
                        </span>
                            </div>

                            {chat.lastMessage && (
                                <div className="chat-last-message">
                                  <p className="chat-message-preview">
                                    {chat.type === "group" && chat.lastMessage.sender !== "currentUser" && (
                                        <span className="font-medium">{chat.lastMessage.senderName || "User"}: </span>
                                    )}
                                    {chat.lastMessage.content}
                                  </p>

                                  {chat.unreadCount > 0 && (
                                      <span className="badge-notification">
                              {chat.unreadCount > 9 ? "9+" : chat.unreadCount}
                            </span>
                                  )}
                                </div>
                            )}
                          </div>
                        </div>
                    ))}
                  </div>
              )}
            </div>
          </div>

          {/* New chat button */}
          <Link
              href="/new-chat"
              className="btn-floating"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </Link>
        </main>
      </div>
  );
}