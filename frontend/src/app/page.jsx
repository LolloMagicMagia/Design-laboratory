"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import API from "@/lib/api";
import clsx from "clsx";
import { Plus, Trash, Search, Edit, Check, X, Menu, EyeOff, Eye, Lock, User } from "lucide-react";

/**
 * Homepage - Main route ("/").
 * @module frontend/page/src/app/page.jsx
 * @description Displays the user's chat list and allows navigation to individual chats.
 */
export default function Home() {

  /**
   * Stores the list of visible chats.
   * @type {Array<Object>}
   */
  const [chats, setChats] = useState([]);

  /**
   * Stores the currently filtered chat list based on search and tab selection.
   * @type {Array<Object>}
   */
  const [filteredChats, setFilteredChats] = useState([]);

  /**
   * Stores the list of hidden chats that require PIN access.
   * @type {Array<Object>}
   */
  const [hiddenChats, setHiddenChats] = useState([]);

  /**
   * Controls the visibility of the chat hiding dialog.
   * @type {boolean}
   */
  const [showHideDialog, setShowHideDialog] = useState(false);

  /**
   * Stores the PIN value entered by the user to hide a chat.
   * @type {string}
   */
  const [pin, setPin] = useState("");

  /**
   * References the chat that the user wants to hide.
   * @type {Object|null}
   */
  const [chatToHide, setChatToHide] = useState(null);

  /**
   * Controls the visibility of the PIN verification dialog for hidden chats.
   * @type {boolean}
   */
  const [showPinDialog, setShowPinDialog] = useState(false);

  /**
   * References the selected hidden chat that the user wants to access.
   * @type {Object|null}
   */
  const [selectedHiddenChat, setSelectedHiddenChat] = useState(null);

  /**
   * Stores the PIN value entered by the user to access a hidden chat.
   * @type {string}
   */
  const [enteredPin, setEnteredPin] = useState("");

  /**
   * Stores any error message related to incorrect PIN entry.
   * @type {string}
   */
  const [pinError, setPinError] = useState("");

  /**
   * Controls the visibility of the unhide chat dialog.
   * @type {boolean}
   */
  const [showUnhidePinDialog, setShowUnhidePinDialog] = useState(false);

  /**
   * References the chat that the user wants to unhide.
   * @type {Object|null}
   */
  const [chatToUnhide, setChatToUnhide] = useState(null);

  /**
   * Stores the PIN value entered by the user to unhide a chat.
   * @type {string}
   */
  const [unhidePin, setUnhidePin] = useState("");

  /**
   * Stores any error message related to incorrect PIN entry for unhiding.
   * @type {string}
   */
  const [unhidePinError, setUnhidePinError] = useState("");

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

  /**
   * Indicates whether the user has any pending friend requests.
   * @type {boolean}
   */
  const [hasFriendRequests, setHasFriendRequests] = useState(false);

  /**
   * Stores the current search query for filtering chats.
   * @type {string}
   */
  const [searchQuery, setSearchQuery] = useState("");

  /**
   * Stores the user's bio text for display and editing.
   * @type {string}
   */
  const [bio, setBio] = useState("");

  /**
   * Indicates whether the user is currently editing their bio.
   * @type {boolean}
   */
  const [editingBio, setEditingBio] = useState(false);

  /**
   * Controls which tab of chats is currently active.
   * Possible values: "all", "dm", "groups", "hidden"
   * @type {string}
   */
  const [activeTab, setActiveTab] = useState("all");

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
      // No user ID found, redirect to login page immediately
      router.push("/login");
      return;
    }
    setCurrentUser(id);
    let client = null;

    client = API.createWebSocketClient(
        false,
        () => {
          console.log("Received chat update");
          fetchAndUpdateChats();
        },
        false
    );

    client.activate();
    fetchAndUpdateChats();

    return () => {
      if (client?.active) {
        client.deactivate();
      }
    };
  }, []);

  /**
   * Fetches and updates the chat lists (visible and hidden) from the backend.
   * Processes chat data and prepares it for display.
   * @async
   * @function fetchAndUpdateChats
   * @returns {Promise<void>}
   */
  const fetchAndUpdateChats = async () => {
    try {
      const user = await API.getCurrentUser();
      // If no user data is returned, redirect to login
      if (!user || !user.id) {
        router.push("/login");
        return;
      }

      const requests = await API.getFriendRequestsList();
      setHasFriendRequests(requests.length > 0);

      setCurrentUser(user);
      setBio(user.bio || "");

      const chatEntries = Object.entries(user.chatUser || {});
      const allUsersMap = await API.getAllUsersForChatList();

      const updatedChats = chatEntries.map(([chatId, chatData]) => {
        let avatar = "https://dummyimage.com/40x40/000/fff&text=U";
        if (chatData.type === "group") {
          avatar = `data:image/png;base64,${chatData.avatar}`;
        } else {
          const chatUsers = Object.entries(allUsersMap);
          const otherUserEntry = chatUsers.find(([uid, data]) => {
            return uid !== user.id && data.chatUser?.[chatId];
          });

          if (otherUserEntry && otherUserEntry[1]?.avatar) {
            avatar = `data:image/png;base64,${otherUserEntry[1].avatar}`;
          }
        }

        return {
          chatId,
          name: chatData.title,
          lastUser: chatData.lastUser,
          lastMessage: chatData.lastMessage,
          timestamp: chatData.timestamp,
          unreadCount: chatData.unreadCount,
          avatar: avatar,
          type: chatData.type || "individual",
        };
      }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      const hidden = [];
      const visible = [];
      if (user.hiddenChats) {
        updatedChats.forEach(chat => {
          if (user.hiddenChats[chat.chatId]) hidden.push(chat);
          else visible.push(chat);
        });
      } else {
        visible.push(...updatedChats);
      }
      setChats(visible);
      setFilteredChats(visible);
      setHiddenChats(hidden);

    } catch (err) {
      console.error("Error in data loading:", err);
      // If the error is due to auth issues, redirect to login
      if (err.message?.includes("auth") || err.status === 401) {
        router.push("/login");
      } else {
        setError("Error loading chats.");
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Updates filtered chats based on the active tab selection and search query.
   * Handles filtering logic for all, direct messages, groups, and hidden chats.
   *
   * @function filterChats
   * @returns {void}
   */
  useEffect(() => {
    if (activeTab === "hidden") {
      setFilteredChats(hiddenChats);
    } else if (searchQuery) {
      const filtered = chats.filter(chat =>
          chat.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      if (activeTab === "dm") {
        setFilteredChats(filtered.filter(chat => chat.type === "individual"));
      } else if (activeTab === "groups") {
        setFilteredChats(filtered.filter(chat => chat.type === "group"));
      } else {
        setFilteredChats(filtered);
      }
    } else {
      if (activeTab === "dm") {
        setFilteredChats(chats.filter(chat => chat.type === "individual"));
      } else if (activeTab === "groups") {
        setFilteredChats(chats.filter(chat => chat.type === "group"));
      } else {
        setFilteredChats(chats);
      }
    }
  }, [searchQuery, chats, activeTab, hiddenChats]);

  /**
   * Initiates the process of hiding a chat with PIN protection.
   * Opens the PIN entry dialog and stores the selected chat.
   *
   * @function handleHideChat
   * @param {Object} chat - The chat to be hidden
   * @returns {void}
   */
  const handleHideChat = (chat) => {
    setChatToHide(chat);
    setPin("");
    setShowHideDialog(true);
  };

  /**
   * Confirms the hiding of a chat with the entered PIN.
   * Calls the API to hide the chat and updates the local state.
   *
   * @async
   * @function confirmHideChat
   * @returns {Promise<void>}
   */
  const confirmHideChat = async () => {
    await API.hideChat(chatToHide.chatId, pin);
    setShowHideDialog(false);
    fetchAndUpdateChats();
  };

  /**
   * Initiates the process of unhiding a chat with PIN verification.
   * Opens the PIN entry dialog and stores the selected chat.
   *
   * @function handleOpenHiddenChat
   * @param {Object} chat - The hidden chat to be accessed
   * @returns {void}
   *
   */
  const handleOpenHiddenChat = (chat) => {
    setSelectedHiddenChat(chat);
    setEnteredPin("");
    setPinError("");
    setShowPinDialog(true);
  };

  /**
   * Verifies the entered PIN to access a hidden chat.
   * If verified, navigates to the chat; otherwise, shows an error.
   *
   * @async
   * @function confirmPin
   * @returns {Promise<void>}
   */
  const confirmPin = async () => {
    const ok = await API.verifyPin(selectedHiddenChat.chatId, enteredPin);
    if (ok) {
      router.push(`/chat/${selectedHiddenChat.chatId}?name=${encodeURIComponent(selectedHiddenChat.name)}`);
    } else {
      setPinError("Incorrect PIN");
    }
  };

  /**
   * Initiates the process of unhiding a chat.
   * Opens the PIN verification dialog for the selected chat.
   *
   * @function handleUnhide
   * @param {Object} chat - The chat to be unhidden
   * @returns {void}
   */
  const handleUnhide = (chat) => {
    setChatToUnhide(chat);
    setUnhidePin("");
    setUnhidePinError("");
    setShowUnhidePinDialog(true);
  };

  /**
   * Verifies the PIN and unhides the chat if correct.
   * Updates the chat lists after successful unhiding.
   *
   * @async
   * @function confirmUnhide
   * @returns {Promise<void>}
   */
  const confirmUnhide = async () => {
    const ok = await API.verifyPin(chatToUnhide.chatId, unhidePin);
    if (ok) {
      await API.unhideChat(chatToUnhide.chatId);
      setShowUnhidePinDialog(false);
      fetchAndUpdateChats();
    } else {
      setUnhidePinError("Incorrect PIN");
    }
  };

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
    try {
      if (!currentUser) return;

      if (unreadCount > 0 && lastUser !== currentUser.id) {
        try {
          await API.markChatAsRead(chatId);
        } catch (err) {
          console.error("Error in marking as read:", err);
        }
      }

      router.push(`/chat/${chatId}?name=${encodeURIComponent(chatName)}`);
    } catch (err) {
      console.error("Error opening chat:", err);
      setError("Unable to open the chat.");
    }
  };

  /**
   * Handles the search functionality for filtering chats based on the user's input.
   * Updates the search query state and filters the list of chats accordingly.
   *
   * @function handleSearch
   * @param {string} value - The search input provided by the user.
   * @returns {void} This function does not return anything.
   */
  const handleSearch = (value) => {
    setSearchQuery(value);
  };


  /**
   * Handles the deletion of a chat.
   * Asks for user confirmation before proceeding.
   * If confirmed, deletes the chat via API and updates the local state.
   *
   * @async
   * @function handleDeleteChat
   * @param {string} chatId - The ID of the chat to be deleted
   * @returns {Promise<void>}
   */
  const handleDeleteChat = async (chatId) => {
    if (!confirm("Are you sure you want to delete this chat?")) return;
    try {
      await API.deleteChat(chatId);
      setChats((prev) => prev.filter((chat) => chat.chatId !== chatId));
      setFilteredChats((prev) => prev.filter((chat) => chat.chatId !== chatId));
    } catch (err) {
      console.error("Error deleting chat:", err);
      alert("Unable to delete the chat.");
    }
  };

  /**
   * Sends the updated bio to the backend and exits the editing mode.
   *
   * @async
   * @function handleBioSave
   * @returns {Promise<void>}
   */
  const handleBioSave = async () => {
    try {
      if (currentUser && currentUser.id) {
        await API.updateUserBio(currentUser.id, bio.trim());
        setEditingBio(false);
        // Aggiorna lo stato currentUser con la nuova bio
        setCurrentUser({
          ...currentUser,
          bio: bio.trim()
        });
        alert("Bio successfully updated.");
      }
    } catch (err) {
      alert("Error saving bio.");
    }
  };

  /**
   * Cancels bio editing and restores the original bio.
   * Resets the bio input to the current user's bio.
   *
   * @function handleBioCancel
   * @returns {void}
   */
  const handleBioCancel = () => {
    setBio(currentUser?.bio || "");
    setEditingBio(false);
  };

  /**
   * Renders the visual status of message read/unread indicators.
   * Shows different status indicators based on whether the user is sender or recipient.
   *
   * @function renderReadStatus
   * @param {string} lastUser - ID of the last user who sent a message
   * @param {number} unreadCount - Number of unread messages
   * @param {string} chatId - ID of the chat
   * @param {string} chatType - Type of chat (individual or group)
   * @returns {JSX.Element|null} The rendered read status indicator or null
   */
  const renderReadStatus = (lastUser, unreadCount, chatId, chatType) => {
    if (!currentUser) return null;

    const isSender = lastUser === currentUser.id;
    const id = `read-status-${chatId}`;

    if (isSender) {
      if (chatType === "group") {
        return (
            <span id={id} className="font-bold" style={{ color: "gray" }}>
        ✓
      </span>
        );
      } else {
        const isDoubleCheck = unreadCount === 0;
        return (
            <span
                id={id}
                className="font-bold"
                style={{ color: isDoubleCheck ? "#980032" : "gray" }}
            >
        {isDoubleCheck ? "✓✓" : "✓"}
      </span>
        );
      }
    }
    if (unreadCount > 0) {
      return (
          <span
              id={id}
              className="font-bold"
              style={{
                backgroundColor: "#980032",
                color: "white",
                padding: "2px 6px",
                borderRadius: "9999px",
                fontSize: "12px",
                display: "inline-block",
                minWidth: "20px",
                textAlign: "center"
              }}
          >
      {unreadCount > 9 ? "9+" : unreadCount}
    </span>
      );
    }
    return null;
  };

  /**
   * Formats a timestamp into a localized date-time string.
   *
   * @function formatTimestamp
   * @param {string|number|Date} timestamp - The timestamp to format
   * @returns {string} The formatted timestamp string
   */
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date.toLocaleString([], {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (error) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
          <div className="text-red-500 mb-4">{error}</div>
          <button onClick={() => window.location.reload()} className="btn btn-primary">Retry</button>
        </div>
    );
  }

  return (
      <div style={{
        width: "100vw",
        height: "100vh",
        position: "fixed",
        top: 0,
        left: 0,
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#f9fafb",
        overflow: "hidden"
      }}>
        <header style={{
          backgroundColor: "#990033",
          padding: "0.1rem 1.5rem",
          color: "white",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid #FFFFFF",
          margin: 0,  // Remove default margin
          width: "100%", // Ensure full width
          boxSizing: "border-box", // Include padding in the width
          borderLeft: "none", // Remove left border
          borderRight: "none", // Remove right border
          borderTop: "none", // Remove top border
        }}>

          <div style={{ display: "flex", flexDirection: "column", color: "white" }}>
            <h1 style={{ fontSize: "1.5rem", fontWeight: "bold", margin: 0 }}>BicoChat</h1>
          </div>


          <img
              src="https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/Milano-Bicocca_University_logo_2.svg/2095px-Milano-Bicocca_University_logo_2.svg.png"
              width="60"
              alt="logo"
              style={{ borderRadius: "4px" }}
          />
        </header>

        <main className="page-container">
          <div className="card">
            {/* Profilo utente con bio */}
            {currentUser && (
                <div style={{
                  padding: "12px",
                  borderBottom: "1px solid #e5e7eb",
                  display: "flex",
                  flexDirection: "column",
                  width: "100%",
                  boxSizing: "border-box"
                }}>
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    width: "100%"
                  }}>
                    <Link
                        href="/profile"
                        style={{
                          textDecoration: "none",
                          color: "#374151",
                        }}
                    >
                      <img
                          src={
                            currentUser.avatar
                                ? `data:image/png;base64,${currentUser.avatar}`
                                : "https://dummyimage.com/32x32/000/fff&text=U"
                          }
                          alt={currentUser.username}
                          style={{
                            width: "42px",
                            height: "42px",
                            borderRadius: "50%",
                            border: "2px solid #990033",
                            objectFit: "cover"
                          }}
                      />
                    </Link>
                    <div style={{
                      display: "flex",
                      flexDirection: "column",
                      overflow: "hidden",
                      flex: 1
                    }}>
                      <Link
                          href="/profile"
                          style={{
                            textDecoration: "none",
                            color: "#374151",
                          }}
                      >
                    <span style={{
                      fontSize: "1rem",
                      fontWeight: "600",
                      marginBottom: "2px",
                      display: "block"
                    }}>
                      {currentUser.username}
                    </span>
                      </Link>

                      {/* Bio section */}
                      {!editingBio ? (
                          <div style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            width: "100%"
                          }}>
                      <span style={{
                        fontSize: "0.85rem",
                        color: "#6b7280",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        flex: 1
                      }}>
                        {bio.trim() ? bio : "Setup your profile bio..."}
                      </span>
                            <button
                                onClick={() => setEditingBio(true)}
                                style={{
                                  background: "none",
                                  border: "none",
                                  cursor: "pointer",
                                  color: "#990033",
                                  padding: "4px",
                                  display: "flex",
                                  alignItems: "center",
                                  borderRadius: "4px",
                                  transition: "background-color 0.2s",
                                  flexShrink: 0
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = "#f3f4f6";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = "transparent";
                                }}
                            >
                              <Edit size={14} />
                            </button>
                          </div>
                      ) : (
                          <div style={{
                            width: "100%"
                          }}>
                      <textarea
                          value={bio}
                          onChange={(e) => setBio(e.target.value.slice(0, 200))}
                          maxLength={200}
                          placeholder="Scrivi la tua bio (max 200 caratteri)..."
                          style={{
                            width: "100%",
                            padding: "6px 8px",
                            fontSize: "0.85rem",
                            border: "1px solid #d1d5db",
                            borderRadius: "6px",
                            resize: "vertical",
                            minHeight: "40px",
                            maxHeight: "100px",
                            outline: "none",
                            fontFamily: "inherit",
                            boxSizing: "border-box"
                          }}
                          onFocus={(e) => {
                            e.target.style.borderColor = "#990033";
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = "#d1d5db";
                          }}
                      />
                            <div style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginTop: "4px"
                            }}>
                              <div style={{
                                fontSize: "0.75rem",
                                color: bio.length > 180 ? "#e53e3e" : "#6b7280",
                              }}>
                                {bio.length}/200
                              </div>
                              <div style={{
                                display: "flex",
                                gap: "6px",
                              }}>
                                <button
                                    onClick={handleBioCancel}
                                    style={{
                                      backgroundColor: "transparent",
                                      border: "1px solid #d1d5db",
                                      borderRadius: "4px",
                                      padding: "4px 8px",
                                      fontSize: "0.75rem",
                                      display: "flex",
                                      alignItems: "center",
                                      cursor: "pointer",
                                      transition: "all 0.2s ease",
                                      color: "#374151"
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.backgroundColor = "#f3f4f6";
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.backgroundColor = "transparent";
                                    }}
                                >
                                  <X size={12} style={{ marginRight: "3px" }} />
                                  Undo
                                </button>
                                <button
                                    onClick={handleBioSave}
                                    style={{
                                      backgroundColor: "#990033",
                                      border: "none",
                                      borderRadius: "4px",
                                      padding: "4px 8px",
                                      color: "white",
                                      fontSize: "0.75rem",
                                      display: "flex",
                                      alignItems: "center",
                                      cursor: "pointer",
                                      transition: "background-color 0.2s ease"
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.backgroundColor = "#660022";
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.backgroundColor = "#990033";
                                    }}
                                >
                                  <Check size={12} style={{ marginRight: "3px" }} />
                                  Save
                                </button>
                              </div>
                            </div>
                          </div>
                      )}
                    </div>
                  </div>
                </div>
            )}

            {/* Search bar migliorata */}
            <div style={{
              padding: "12px",
              borderBottom: "1px solid #e5e7eb"
            }}>
              <div style={{ position: "relative" }}>
              <span style={{
                position: "absolute",
                left: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#9ca3af"
              }}>
                <Search size={16} />
              </span>
                <input
                    type="text"
                    placeholder="Search through your chats..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    style={{
                      padding: "8px 12px 8px 32px",
                      borderRadius: "10px",
                      boxShadow: "0 2px 5px rgba(0, 0, 0, 0.1)",
                      outline: "none",
                      width: "100%",
                      fontSize: "0.875rem",
                      transition: "all 0.3s ease",
                      border: "2px solid #e5e7eb",
                      backgroundColor: "#f9fafb",
                      boxSizing: "border-box"
                    }}
                />
              </div>
            </div>

            <div style={{
              display: "flex",
              borderBottom: "1px solid #e5e7eb",
              padding: "0 12px",
              backgroundColor: "#f9fafb"
            }}>
              <button
                  onClick={() => setActiveTab("all")}
                  style={{
                    padding: "10px 16px",
                    fontSize: "0.875rem",
                    fontWeight: activeTab === "all" ? "600" : "400",
                    color: activeTab === "all" ? "#990033" : "#6b7280",
                    backgroundColor: "transparent",
                    border: "none",
                    borderBottom: activeTab === "all" ? "2px solid #990033" : "2px solid transparent",
                    cursor: "pointer",
                    transition: "all 0.2s ease"
                  }}
              >
                All Chats
              </button>
              <button
                  onClick={() => setActiveTab("dm")}
                  style={{
                    padding: "10px 16px",
                    fontSize: "0.875rem",
                    fontWeight: activeTab === "dm" ? "600" : "400",
                    color: activeTab === "dm" ? "#990033" : "#6b7280",
                    backgroundColor: "transparent",
                    border: "none",
                    borderBottom: activeTab === "dm" ? "2px solid #990033" : "2px solid transparent",
                    cursor: "pointer",
                    transition: "all 0.2s ease"
                  }}
              >
                Direct Messages
              </button>
              <button
                  onClick={() => setActiveTab("groups")}
                  style={{
                    padding: "10px 16px",
                    fontSize: "0.875rem",
                    fontWeight: activeTab === "groups" ? "600" : "400",
                    color: activeTab === "groups" ? "#990033" : "#6b7280",
                    backgroundColor: "transparent",
                    border: "none",
                    borderBottom: activeTab === "groups" ? "2px solid #990033" : "2px solid transparent",
                    cursor: "pointer",
                    transition: "all 0.2s ease"
                  }}
              >
                Groups
              </button>
              <button
                  onClick={() => setActiveTab("hidden")}
                  style={{
                    padding: "10px 16px",
                    fontSize: "0.875rem",
                    fontWeight: activeTab === "hidden" ? "600" : "400",
                    color: activeTab === "hidden" ? "#990033" : "#6b7280",
                    backgroundColor: "transparent",
                    border: "none",
                    borderBottom: activeTab === "hidden" ? "2px solid #990033" : "2px solid transparent",
                    cursor: "pointer",
                    transition: "all 0.2s ease"
                  }}
              >
                Hidden Chats
              </button>
            </div>


            {/* Lista chat con stile migliorato */}
            <div style={{ maxHeight: "calc(100vh - 300px)", overflowY: "auto" }}>
              {activeTab === "hidden" && (
                  <div>
                    {filteredChats.length === 0 ? (
                        <div style={{display: "flex", justifyContent: "center", alignItems: "center", padding: "20px"}}>
                          No Hidden Chats found
                        </div>
                    ) : (
                        <div className="divide-y" style={{
                          marginBottom: "3.5px"
                        }}>
                          {filteredChats.map(chat => (
                              <div
                                  key={chat.chatId}
                                  className={clsx("hover:bg-gray-100 transition-colors duration-200", { "bg-gray-50": chat.unreadCount > 0 })}
                                  style={{
                                    padding: "12px 16px",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "12px",
                                    cursor: "pointer"
                                  }}
                                  onClick={() => handleOpenHiddenChat(chat)}
                              >
                                <div style={{
                                  position: "relative",
                                  width: "48px",
                                  height: "48px",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  background: "#f3f4f6",
                                  borderRadius: "50%",
                                  border:  "2px solid transparent"
                                }}>
                                  <User size={40} color="#6b7280" />
                                </div>
                                <div style={{ flex: 1, minWidth: 0}}>
                                  <div style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    marginBottom: "16px"
                                  }}>
                                    <h3 style={{
                                      fontSize: "0.95rem",
                                      fontWeight: chat.unreadCount > 0 ? 600 : 500,
                                      margin: 0,
                                      color: "#111827",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap",
                                      display: "flex",
                                      alignItems: "center"
                                    }}>
                                      {chat.name}
                                      <Lock size={18} color="#990033" style={{ marginLeft: 6, verticalAlign: "middle" }} />
                                    </h3>
                                    <div style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "8px",
                                      minWidth: "180px",
                                      justifyContent: "flex-end"
                                    }}>
                                <span style={{
                                  fontSize: "0.75rem",
                                  color: "#6b7280",
                                  whiteSpace: "nowrap"
                                }}>
                                  {formatTimestamp(chat.timestamp)}
                                </span>
                                      <button
                                          onClick={e => {
                                            e.stopPropagation();
                                            handleUnhide(chat);
                                          }}
                                          title="Rendi visibile"
                                          style={{
                                            color: "#22c55e",
                                            background: "none",
                                            border: "none",
                                            cursor: "pointer",
                                            padding: "3px",
                                            borderRadius: "50%",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center"
                                          }}
                                          onMouseEnter={e => {
                                            e.currentTarget.style.backgroundColor = "lightgray";
                                          }}
                                          onMouseLeave={e => {
                                            e.currentTarget.style.backgroundColor = "transparent";
                                          }}
                                      >
                                        <Eye size={18} />
                                      </button>
                                    </div>
                                  </div>
                                  {/* Non mostrare l'ultimo messaggio */}
                                </div>
                              </div>
                          ))}
                        </div>
                    )}
                  </div>
              )}
              {activeTab !== "hidden" && (
                  filteredChats.length === 0 ? (
                      <div style={{display: "flex", justifyContent: "center", alignItems: "center", padding: "20px"}}>
                        No Chats found
                      </div>
                  ) : (
                      <div className="divide-y">
                        {filteredChats.map(chat => (
                            <div
                                key={chat.chatId}
                                className={clsx("hover:bg-gray-100 transition-colors duration-200", { "bg-gray-50": chat.unreadCount > 0 })}
                                data-testid={`chat-${chat.name.replace(/\s+/g, "-")}`}
                                onClick={() => handleChatClick(chat.chatId, chat.name, chat.lastUser, chat.unreadCount)}
                                style={{
                                  padding: "12px 16px",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "12px",
                                  cursor: "pointer"
                                }}
                            >
                              <div style={{ position: "relative" }}>
                                <img
                                    src={chat.avatar || "https://dummyimage.com/48x48/000/fff&text=U"}
                                    alt={chat.name}
                                    style={{
                                      width: "48px",
                                      height: "48px",
                                      borderRadius: "50%",
                                      objectFit: "cover",
                                      border: "2px solid transparent"
                                    }}
                                />
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  marginBottom: "2px"
                                }}>
                                  <h3 style={{
                                    fontSize: "0.95rem",
                                    fontWeight: chat.unreadCount > 0 ? 600 : 500,
                                    margin: 0,
                                    color: "#111827",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap"
                                  }}>
                                    {chat.name}
                                  </h3>
                                  <div style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    minWidth: "180px",
                                    justifyContent: "flex-end"
                                  }}>
                                <span style={{
                                  fontSize: "0.75rem",
                                  color: "#6b7280",
                                  whiteSpace: "nowrap"
                                }}>
                                  {formatTimestamp(chat.timestamp)}
                                </span>
                                    {chat.type === "individual" && (
                                        <button
                                            onClick={e => {
                                              e.stopPropagation();
                                              handleDeleteChat(chat.chatId);
                                            }}
                                            title="Delete Chat"
                                            style={{
                                              color: "#f43f5e",
                                              background: "none",
                                              border: "none",
                                              cursor: "pointer",
                                              padding: "3px",
                                              borderRadius: "50%",
                                              display: "flex",
                                              alignItems: "center",
                                              justifyContent: "center"
                                            }}
                                            onMouseEnter={e => {
                                              e.currentTarget.style.backgroundColor = "#fee2e2";
                                            }}
                                            onMouseLeave={e => {
                                              e.currentTarget.style.backgroundColor = "transparent";
                                            }}
                                        >
                                          <Trash size={16} />
                                        </button>
                                    )}
                                    <button
                                        onClick={e => {
                                          e.stopPropagation();
                                          handleHideChat(chat);
                                        }}
                                        title="Nascondi Chat"
                                        style={{
                                          color: "#6366f1",
                                          background: "none",
                                          border: "none",
                                          cursor: "pointer",
                                          padding: "3px",
                                          borderRadius: "50%",
                                          marginLeft: "4px",
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center"
                                        }}
                                        onMouseEnter={e => {
                                          e.currentTarget.style.backgroundColor = "lightgray";
                                        }}
                                        onMouseLeave={e => {
                                          e.currentTarget.style.backgroundColor = "transparent";
                                        }}
                                    >
                                      <EyeOff size={18} />
                                    </button>
                                  </div>
                                </div>
                                <div style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "4px"
                                }}>
                                  {renderReadStatus(chat.lastUser, chat.unreadCount, chat.chatId, chat.type) && (
                                      <span style={{
                                        fontSize: chat.unreadCount > 0 ? "0.75rem" : "0.7rem",
                                        color: chat.unreadCount > 0 ? "#ef4444" : "#64748b",
                                        fontWeight: chat.unreadCount > 0 ? 600 : 400
                                      }}>
                            {renderReadStatus(chat.lastUser, chat.unreadCount, chat.chatId, chat.type)}
                          </span>
                                  )}
                                  <span style={{
                                    fontSize: "0.85rem",
                                    color: "#6b7280",
                                    fontWeight: chat.unreadCount > 0 ? 500 : 400,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                    flex: 1
                                  }}>
                          {chat.lastMessage || "No messages yet"}
                        </span>
                                </div>
                              </div>
                            </div>
                        ))}
                      </div>
                  )
              )}
            </div>
          </div>

          {/* Floating action button per nuova chat */}
          <div style={{ position: "fixed", bottom: "20px", right: "20px", zIndex: 10 }}>
            <Link href="/new-chat" style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              backgroundColor: "#990033",
              color: "white",
              boxShadow: "0 4px 14px 0 rgba(0, 0, 0, 0.25)",
              textDecoration: "none",
              position: "relative",
              transition: "background-color 0.2s ease"
            }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#660022";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#990033";
                  }}>
              <Plus size={24} />
              {hasFriendRequests && (
                  <span
                      style={{
                        position: "absolute",
                        top: "-4px",
                        right: "-4px",
                        backgroundColor: "red",
                        borderRadius: "50%",
                        width: "16px",
                        height: "16px",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        fontSize: "10px",
                        fontWeight: "bold",
                        color: "white"
                      }}
                  ></span>
              )}
            </Link>
          </div>

        </main>
        {showHideDialog && (
            <div className="dialog" style={{
              position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
              background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000
            }}>
              <div style={{ background: "white", padding: "24px", borderRadius: "8px", minWidth: "300px" }}>
                <h3 style={{ marginBottom: "16px" }}>Enter PIN to hide the Chat</h3>
                <input
                    type="password"
                    value={pin}
                    onChange={e => setPin(e.target.value)}
                    style={{
                      width: "100%",
                      margin: "5px 0 10px -6px",
                      padding: "5px",
                      borderRadius: "6px",
                      border: "1px solid #d1d5db",
                      fontSize: "1rem",
                      outline: "none"
                    }}
                />
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                  <button
                      onClick={() => setShowHideDialog(false)}
                      style={{
                        backgroundColor: "transparent",
                        border: "1px solid #d1d5db",
                        borderRadius: "4px",
                        padding: "6px 14px",
                        fontSize: "0.95rem",
                        color: "#374151",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        transition: "background-color 0.2s"
                      }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = "#f3f4f6"}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}
                  >
                    Undo
                  </button>
                  <button
                      onClick={confirmHideChat}
                      disabled={!pin}
                      style={{
                        backgroundColor: "#990033",
                        border: "none",
                        borderRadius: "4px",
                        padding: "6px 14px",
                        color: "white",
                        fontSize: "0.95rem",
                        cursor: !pin ? "not-allowed" : "pointer",
                        opacity: !pin ? 0.7 : 1,
                        display: "flex",
                        alignItems: "center",
                        transition: "background-color 0.2s"
                      }}
                      onMouseEnter={e => { if (pin) e.currentTarget.style.backgroundColor = "#660022"; }}
                      onMouseLeave={e => { if (pin) e.currentTarget.style.backgroundColor = "#990033"; }}
                  >
                    Confirm
                  </button>
                </div>
              </div>
            </div>
        )}
        {showPinDialog && (
            <div className="dialog" style={{
              position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
              background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000
            }}>
              <div style={{ background: "white", padding: "24px", borderRadius: "8px", minWidth: "300px" }}>
                <h3 style={{ marginBottom: "16px" }}>Enter PIN to access the Chat</h3>
                <input
                    type="password"
                    value={enteredPin}
                    onChange={e => setEnteredPin(e.target.value)}
                    style={{
                      width: "100%",
                      margin: "5px 0 10px -6px",
                      padding: "5px",
                      borderRadius: "6px",
                      border: "1px solid #d1d5db",
                      fontSize: "1rem",
                      outline: "none"
                    }}
                />
                {pinError && <div style={{ color: "red", marginBottom: "8px" }}>{pinError}</div>}
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                  <button
                      onClick={() => setShowPinDialog(false)}
                      style={{
                        backgroundColor: "transparent",
                        border: "1px solid #d1d5db",
                        borderRadius: "4px",
                        padding: "6px 14px",
                        fontSize: "0.95rem",
                        color: "#374151",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        transition: "background-color 0.2s"
                      }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = "#f3f4f6"}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}
                  >
                    Undo
                  </button>
                  <button
                      onClick={confirmPin}
                      style={{
                        backgroundColor: "#990033",
                        border: "none",
                        borderRadius: "4px",
                        padding: "6px 14px",
                        color: "white",
                        fontSize: "0.95rem",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        transition: "background-color 0.2s"
                      }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = "#660022"}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = "#990033"}
                  >
                    Access
                  </button>
                </div>
              </div>
            </div>
        )}
        {showUnhidePinDialog && (
            <div className="dialog" style={{
              position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
              background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000
            }}>
              <div style={{ background: "white", padding: "24px", borderRadius: "8px", minWidth: "300px" }}>
                <h3 style={{ marginBottom: "16px" }}>Enter PIN to unhide the Chat</h3>
                <input
                    type="password"
                    value={unhidePin}
                    onChange={e => setUnhidePin(e.target.value)}
                    style={{
                      width: "100%",
                      margin: "5px 0 10px -6px",
                      padding: "5px",
                      borderRadius: "6px",
                      border: "1px solid #d1d5db",
                      fontSize: "1rem",
                      outline: "none"
                    }}
                />
                {unhidePinError && <div style={{ color: "red", marginBottom: "8px" }}>{unhidePinError}</div>}
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                  <button
                      onClick={() => setShowUnhidePinDialog(false)}
                      style={{
                        backgroundColor: "transparent",
                        border: "1px solid #d1d5db",
                        borderRadius: "4px",
                        padding: "6px 14px",
                        fontSize: "0.95rem",
                        color: "#374151",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        transition: "background-color 0.2s"
                      }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = "#f3f4f6"}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}
                  >
                    Undo
                  </button>
                  <button
                      onClick={confirmUnhide}
                      style={{
                        backgroundColor: "#990033",
                        border: "none",
                        borderRadius: "4px",
                        padding: "6px 14px",
                        color: "white",
                        fontSize: "0.95rem",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        transition: "background-color 0.2s"
                      }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = "#660022"}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = "#990033"}
                  >
                    Unhide
                  </button>
                </div>
              </div>
            </div>
        )}
      </div>

  );
}