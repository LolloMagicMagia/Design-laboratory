"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import API from "@/lib/api";

/**
 * Homepage - Main route ("/").
 * @module frontend/page/src/app/page.jsx
 * @description Displays the user's chat list and allows navigation to individual chats.
 */

export default function Home() {
  /**
   * Stores the list of chats.
   * @type {Array<Object>}
   */
  const [chats, setChats] = useState([]);

  /**
   * Stores the current user's data.
   * @type {Object|null}
   */
  const [currentUser, setCurrentUser] = useState(null);

  /**
   * Tracks whether data is still being loaded.
   * @type {boolean}
   */
  const [loading, setLoading] = useState(true);

  /**
   * Stores any error message encountered during loading or user actions.
   * @type {string|null}
   */
  const [error, setError] = useState(null);

  const router = useRouter();

  /**
   * Fetches the current user and their chat list on component mount.
   * Retrieves chat data and sets application state.
   * @async
   * @function fetchData
   * @returns {Promise<void>}
   */
  useEffect(() => {
    const id = localStorage.getItem("currentUserId");
    if (!id) {
      setError("Utente non autenticato");
      return;
    }
    setCurrentUser(id);

    const fetchData = async () => {
      try {
        const user = await API.getCurrentUser();
        setCurrentUser(user);

        const fetchedChats = Object.entries(user.chatUser).map(([chatId, chatData]) => ({
          chatId,
          name: chatData.name,
          lastUser: chatData.lastUser,
          lastMessage: chatData.lastMessage,
          timestamp: chatData.timestamp,
          unreadCount: chatData.unreadCount
        }));

        setChats(fetchedChats);
        setLoading(false);
      } catch (err) {
        console.error("Errore nel caricamento dei dati:", err);
        setError("Errore nel caricamento delle chat.");
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  /**
   * Handles when a user clicks on a chat.
   * Marks the chat as read if needed and redirects to the chat page.
   * @async
   * @function handleChatClick
   * @param {string} chatId - The ID of the selected chat.
   * @param {string} chatName - The name of the chat.
   * @param {string} lastUser - The ID of the last user who sent a message.
   * @param {number} unreadCount - Number of unread messages.
   * @returns {Promise<void>}
   */
  const handleChatClick = async (chatId, chatName, lastUser, unreadCount) => {
    console.log("tutto: ", chatId, " ", chatName, " ", lastUser, " ", unreadCount);
    try {
      if (!currentUser) {
        console.error("Utente non loggato");
        return;
      }

      if (unreadCount > 0 && lastUser !== currentUser.id) {
        try {
          await API.markChatAsRead(chatId);
        } catch (markReadError) {
          console.error("Errore nel marcare la chat come letta:", markReadError);
        }
      }

      router.push(`/chat/${chatId}?name=${encodeURIComponent(chatName)}`);
    } catch (err) {
      console.error("Errore apertura chat:", err);
      setError("Impossibile aprire la chat.");
    }
  };

  /**
   * Renders the visual status of message read/unread indicators.
   * @function renderReadStatus
   * @param {string} lastUser - ID of the last user who sent a message.
   * @param {number} unreadCount - Number of unread messages.
   * @returns {JSX.Element|null}
   */
  const renderReadStatus = (lastUser, unreadCount) => {
    if (!currentUser) return null;

    if (lastUser === currentUser.id) {
      return (
          <span className="message-read-status text-green-500 font-bold">
          {unreadCount > 0 ? "✓" : "✓✓"}
        </span>
      );
    }

    if (unreadCount > 0) {
      return (
          <span className="message-unread-status text-red-500 font-bold">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      );
    }
    return null;
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Caricamento...</div>;
  }

  if (error) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
          <div className="text-red-500 mb-4">{error}</div>
          <button onClick={() => window.location.reload()} className="btn btn-primary">Riprova</button>
        </div>
    );
  }

  return (
      <div className="page-container">
        <header className="page-header">
          <div className="container mx-auto flex justify-between items-center">
            <h1 className="text-xl font-bold">BicoChat</h1>
            {currentUser && (
                <Link href="/profile" className="flex items-center">
                  <img
                      src={currentUser.avatar || "https://dummyimage.com/40x40/000/fff&text=U"}
                      alt={currentUser.username}
                      className="w-8 h-8 rounded-full mr-2"
                  />
                  <span>{currentUser.username}</span>
                </Link>
            )}
          </div>
        </header>
        <main className="page-content">
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-semibold">Le tue chat</h2>
            </div>
            <div>
              {chats.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">Nessuna chat attiva.</div>
              ) : (
                  <div className="divide-y">
                    {chats.map(chat => (
                        <div
                            key={chat.chatId}
                            className={`chat-list-item ${chat.unreadCount > 0 ? "unread" : ""}`}
                            onClick={() => handleChatClick(chat.chatId, chat.name, chat.lastUser, chat.unreadCount)}
                        >
                          {/* Chat avatar */}
                          <div className="chat-avatar">
                            <img
                                src="https://dummyimage.com/48x48/000/fff&text=C"
                                alt={chat.name}
                                className="chat-avatar-image"
                            />
                          </div>

                          {/* Chat information */}
                          <div className="chat-info">
                            <div className="chat-header">
                              {/* Chat name with icon */}
                              <h3 className="chat-name flex items-center">
                                {chat.name}
                              </h3>
                              {/* Last message timestamp */}
                              <span className="chat-time">{chat.timestamp}</span>
                            </div>

                            {/* Last message preview with status icon */}
                            <div className="flex items-center">
                              <span className="mr-2">{renderReadStatus(chat.lastUser, chat.unreadCount)}</span>
                              <span className="chat-message-preview">{chat.lastMessage}</span>
                            </div>
                          </div>
                        </div>
                    ))}
                  </div>
              )}
            </div>
          </div>
          <Link href="/new-chat" className="btn-floating">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </Link>
        </main>
      </div>
  );
}
