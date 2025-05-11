"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import API from "@/lib/api";

/**
 * NewChatPage Component - Displays the interface for creating a new chat.
 *
 * This component:
 * - Retrieves the list of friends from the API
 * - Allows the user to select participants for a new chat
 * - Supports the creation of individual and group chats
 * - Handles form submission to create the chat
 * - Displays error messages if there are any issues during the chat creation process
 *
 * @module frontend/page/src/app/new-chat/page.jsx
 * @returns {JSX.Element} The rendered new chat creation page.
 */
export default function NewChatPage() {
  /**
   * The state holding the list of friends.
   * @type {Array<Object>}
   */
  const [friends, setFriends] = useState([]);

  /**
   * The state holding the list of selected users for creating a chat.
   * @type {Array<Object>}
   */
  const [selectedUsers, setSelectedUsers] = useState([]);

  /**
   * The state holding the type of the chat (e.g., 'individual' or 'group').
   * @type {string}
   */
  const [chatType, setChatType] = useState("individual");

  /**
   * The loading state for fetching data or performing an action.
   * @type {boolean}
   */
  const [loading, setLoading] = useState(true);

  /**
   * The state indicating if the chat creation process is ongoing.
   * @type {boolean}
   */
  const [creating, setCreating] = useState(false);

  /**
   * The error message if any occurs during the creation or fetching process.
   * @type {string|null}
   */
  const [error, setError] = useState(null);

  /**
   * The state holding the initial message to be sent when the chat is created.
   * @type {string}
   */
  const [initialMessage, setInitialMessage] = useState(""); // Nuovo stato per il messaggio iniziale

  /**
   * Router object for navigating programmatically.
   * @type {Object}
   * @property {function} push - Function to navigate to a new route.
   */
  const router = useRouter();

  /**
   * Loads the list of friends when the component mounts.
   * Handles loading state and error state.
   * @function useEffect
   * @async
   * @returns {void}
   */
  useEffect(() => {
    const fetchData = async () => {
      try {
        const friendsList = await API.getFriendsList();
        setFriends(friendsList);
        setLoading(false);
      } catch (err) {
        console.error("Errore nel caricamento degli amici:", err);
        setError("Si è verificato un errore nel caricamento. Riprova più tardi.");
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter Active Friends
  const activeFriends = friends.filter(friend => friend.friendshipStatus === "active");
  // Filter pending requests
  //const pendingFriends = friends.filter(friend => friend.friendshipStatus === "pending");

  /**
   * Automatically updates the chat name for individual chats when a user is selected.
   * Triggers when the selected users, chat type, or friends list changes.
   * @function useEffect
   * @returns {void}
   */
  /*useEffect(() => {
    if (chatType === "individual" && selectedUsers.length === 1) {
      const user = friends.find(u => u.id === selectedUsers[0]);
      if (user) {
        setChatName(user.username || user.name);
      }
    }
  }, [selectedUsers, chatType, friends]);*/

  /**
   * Toggles the selection of a user for chat creation.
   * Adds the user to the selection if they are not already selected,
   * or removes them if they are. For individual chats, only one user can be selected at a time.
   * @function handleUserToggle
   * @param {string} userId - The ID of the user to toggle in the selection.
   * @returns {void}
   */
  const handleUserToggle = (userId) => {
    setSelectedUsers(prevSelected => {
      if (prevSelected.includes(userId)) {
        // Rimuovi l'utente dalla selezione
        return prevSelected.filter(id => id !== userId);
      } else {
        // Aggiungi l'utente alla selezione
        if (chatType === "individual" && prevSelected.length === 1) {
          // Per le chat individuali, permetti solo un utente selezionato
          return [userId];
        }
        return [...prevSelected, userId];
      }
    });
  };

  /**
   * Handles the click event for creating a new chat.
   * Validates that at least one user is selected and that an initial message is provided.
   * If the validation passes, it proceeds to create the chat by calling `handleCreateChat`.
   *
   * @async
   * @function handleButtonCreateChat
   * @returns {void}
   */
  const handleButtonCreateChat = async () => {
    setError(null);

    // Check if at least one friend is selected
    if (selectedUsers.length === 0) {
      setError("Seleziona almeno un amico per la chat.");
      return;
    }

    // Check if a message has been written
    if (!initialMessage.trim()) {
      setError("Devi scrivere un messaggio per creare la chat.");
      return;
    }

    else{
      handleCreateChat();
    }
    // Check if a name for the group chat has been entered
    /*if (chatType === "group" && !chatName.trim()) {
      setError("Inserisci un nome per la chat di gruppo.");
      return;
    }*/
  };

  /**
   * Handles the process of creating a new chat.
   * This function first checks the chat type (individual or group) and performs the corresponding creation process.
   * For an individual chat, it checks if the user is already a friend, and if not, it shows an error.
   * If the chat already exists, it shows an error message.
   * If the chat is successfully created, it navigates to the newly created chat.
   *
   * @async
   * @function handleCreateChat
   * @returns {void}
   */
  const handleCreateChat = async () => {
    setError(null);

    try {
      setCreating(true);

      // Handle the creation of an individual chat
      if (chatType === "individual") {
        const friendId = selectedUsers[0];

        // Check if the user is already a friend
        if (friends.some(friend => friend.id === friendId)) {
          const result = await API.createIndividualChatIfNotExists(friendId, initialMessage);

          // If the chat already exists, show an error
          if (result.alreadyExists) {
            setError("Esiste già una chat con questo utente.");
            setTimeout(() => setError(null), 3000);
            setCreating(false);
            return;
          }

          // If the chat is created successfully, navigate to the chat
          router.push("../");
        } else {
          setError("Non sei ancora amico con questo utente.");
          setTimeout(() => setError(null), 3000);
          setCreating(false);
        }
        return;
      }

      // Handle the creation of a group chat
      /*const currentUserId = await API.getCurrentUserId();
      const timestamp = new Date().toISOString();
      const participants = [currentUserId, ...selectedUsers];

      const chatId = `chat_${Date.now()}`;
      await API.createGroupChat(chatId, chatName, participants, timestamp);

      // Navigazione alla chat di gruppo appena creata
      router.push(`/chat/${chatId}`);*/
    } catch (err) {
      console.error("Errore nella creazione della chat:", err);
      setError("Errore nella creazione della chat. Riprova più tardi.");
      setCreating(false);
    }
  };


  // Function to get the color based on the status
  const getStatusColor = (status) => {
    switch (status) {
      case "active": return "bg-green-500";
      case "pending": return "bg-yellow-500";
      case "blocked": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

// Check if the button should be disabled
  //const isCreateButtonDisabled = selectedUsers.length === 0 || !initialMessage.trim() || creating;

  if (loading) {
    return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-xl font-semibold">Caricamento...</div>
        </div>
    );
  }

  return (
      <div className="page-container">
        <header className="page-header">
          <div className="container mx-auto flex items-center">
            <button onClick={() => router.push("/")} className="btn btn-icon">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-xl font-bold ml-3">Nuova chat</h1>
          </div>
        </header>

        <main className="page-content">
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-semibold mb-4">Tipo di chat</h2>
              <div className="flex space-x-4">
                <button
                    onClick={() => {
                      setChatType("individual");
                      if (selectedUsers.length > 1) setSelectedUsers([selectedUsers[0]]);
                    }}
                    className={`btn ${chatType === "individual" ? "btn-primary" : "btn-secondary"}`}
                >
                  Individuale
                </button>
                <button
                    onClick={() => setChatType("group")}
                    className={`btn ${chatType === "group" ? "btn-primary" : "btn-secondary"}`}
                >
                  Gruppo
                </button>
              </div>
            </div>

            {chatType === "individual" && selectedUsers.length === 1 && (
                <div className="card-content border-b">
                  <div className="form-group">
                    <label htmlFor="initialMessage" className="form-label">Messaggio iniziale</label>
                    <input
                        type="text"
                        id="initialMessage"
                        value={initialMessage}
                        onChange={(e) => setInitialMessage(e.target.value)}
                        placeholder="Scrivi il primo messaggio..."
                        className="form-input"
                    />
                  </div>
                </div>
            )}

            <div className="card-content">
              <h2 className="text-lg font-semibold mb-4">I tuoi amici</h2>

              {error && (
                  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    {error}
                  </div>
              )}

              <div className="user-list">
                {activeFriends.length === 0 ? (
                    <div className="py-4 text-center text-gray-500">
                      Non hai ancora amici
                    </div>
                ) : (
                    activeFriends.map(user => (
                        <div key={user.id} className="user-list-item">
                          <input
                              type="checkbox"
                              id={`user-${user.id}`}
                              checked={selectedUsers.includes(user.id)}
                              onChange={() => handleUserToggle(user.id)}
                              className="h-5 w-5 text-blue-600"
                              disabled={chatType === "individual" && selectedUsers.length === 1 && !selectedUsers.includes(user.id)}
                          />
                          <label htmlFor={`user-${user.id}`} className="ml-3 flex items-center cursor-pointer flex-1">
                            <img
                                src={user.avatar || "https://dummyimage.com/40x40/000/fff&text=P"}
                                alt={user.username || user.name}
                                className="user-avatar"
                                style={{ width: "40px", height: "40px" }}
                            />
                            <div className="user-info">
                              <p className="user-name">{user.username || user.name}</p>
                              <div className="flex items-center">
                                <span className={`w-2 h-2 rounded-full mr-2 ${getStatusColor(user.friendshipStatus)}`}></span>
                                <span className="capitalize text-sm text-gray-500">
                                  Amico
                                </span>
                              </div>
                            </div>
                          </label>
                        </div>
                    ))
                )}
              </div>
            </div>

            <div className="card-footer flex justify-end">
              <button
                  onClick={() => router.push("/")}
                  className="btn btn-secondary mr-2"
              >
                Annulla
              </button>
              <button
                  onClick={handleButtonCreateChat}
                  className="btn btn-primary"
              >
                {creating ? "Creazione in corso..." : "Crea Chat"}
              </button>
            </div>
          </div>
        </main>
      </div>
  );
}
