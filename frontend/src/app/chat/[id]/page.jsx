"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import API from "@/lib/api";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";
import { ArrowLeft, Paperclip, Smile, X, Search } from "lucide-react";

/**
 * Generates the URL for the user's avatar.
 * @function getAvatarSrc
 * @param {string} avatar - The avatar image in base64 format.
 * @param {string} fallback - The fallback character to display if the avatar is missing.
 * @returns {string} The URL of the avatar image.
 */
const getAvatarSrc = (avatar, fallback = "U") => {
  return avatar
      ? `data:image/png;base64,${avatar}`
      : `https://dummyimage.com/40x40/000/fff&text=${fallback}`;
};

/**
 * ChatPage component for managing a chat interface.
 *
 * This component enables real-time communication between users in a chat,
 * using WebSocket for live updates and a REST API for fetching/sending messages.
 * It supports emoji input, message editing, deleting, image attachments, and group/user navigation.
 *
 * @module frontend/page/src/app/chat/id/page.jsx
 * @returns {JSX.Element} Rendered Chat UI
 */
export default function ChatPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const title = searchParams.get("name") || "Chat";
  const chatId = params?.id;
  /**
   * State to control the visibility of the emoji picker.
   * @constant {boolean} showEmojiPicker
   */
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  /**
   * The object representing the current chat metadata (participants, etc.).
   * @constant {Object | null} chat
   */
  const [chat, setChat] = useState(null);

  /**
   * The list of messages exchanged in the chat.
   * @constant {Array<Object>} messages
   */
  const [messages, setMessages] = useState([]);

  const [currentUserId, setCurrentUserId] = useState(null);

  /**
   * The message being composed by the user.
   * @constant {string} newMessage
   */
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [error, setError] = useState(null);
  const [usersMap, setUsersMap] = useState({});
  const [openMenuId, setOpenMenuId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editedText, setEditedText] = useState("");
  const [attachedImage, setAttachedImage] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  // For search messages
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [filteredMessages, setFilteredMessages] = useState([]);

  /**
   * Reference to the bottom of the message list for auto-scrolling.
   * @constant {React.RefObject}
   */
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const searchInputRef = useRef(null);
  const router = useRouter();

  /**
   * Retrieves the current user ID from localStorage.
   * If not found, sets an error.
   * @function useEffect
   * @returns {void} This function does not return anything.
   */

  useEffect(() => {
    const id = localStorage.getItem("currentUserId");
    if (!id) return setError("User not authenticated");
    setCurrentUserId(id);
  }, []);

  /**
   * Loads chat data, including messages and participant users.
   * Redirects to the main page if the user is not a participant of the chat.
   * @function useEffect
   * @returns {void} This function does not return anything.
   */
  useEffect(() => {
    if (!chatId || !currentUserId) return;

    const fetchData = async () => {
      try {
        const chatData = await API.getChatById(chatId);
        setChat({ id: chatData.id, ...chatData.chat });

        if (!chatData.chat.participants?.includes(currentUserId)) {
          router.push("/");
          return;
        }

        const mappedMessages = await API.getMessagesByChatId(chatId);
        setMessages(mappedMessages);

        const userIds = [...new Set(chatData.chat.participants)];
        const users = await Promise.all(userIds.map((uid) => API.getUserById(uid)));
        const map = {};
        users.forEach((u) => {
          if (u?.id) map[String(u.id)] = u;
        });
        setUsersMap(map);
      } catch (err) {
        console.error("Error loading chat data:", err);
        setError("Unable to load chat.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [chatId, currentUserId]);

  const alreadyFetchedImages = useRef(new Set());

  /**
   * Handles real-time message updates via WebSocket.
   * Detects duplicate messages and synchronizes images.
   *
   * @function useEffect
   * @returns {void} This function does not return anything.
   */
  useEffect(() => {
    if (!chatId || !currentUserId) return;

    const client = API.createWebSocketClient(false, false, (messagesData) => {
      const filteredMessages = messagesData.filter((msg) => msg.chatId === chatId);
      if (!filteredMessages.length) return;

      setMessages((prevMessages) => {
        const prevMap = new Map(prevMessages.map((m) => [m.id, m]));

        filteredMessages.forEach((msg) => {
          const previous = prevMap.get(msg.id);

          // Better deduplication strategy
          // Look for a temporary message that should be replaced
          let foundLocalMatch = false;
          for (let [prevId, prevMsg] of prevMap.entries()) {
            if (
                prevId.startsWith("local-") &&
                prevMsg.content === msg.content &&
                prevMsg.sender === msg.sender &&
                Math.abs(new Date(prevMsg.timestamp) - new Date(msg.timestamp)) < 5000
            ) {
              // Keep temporary image if real message doesn't have it yet
              if (!msg.image && prevMsg.image) {
                msg.image = prevMsg.image;
              }
              prevMap.delete(prevId);
              foundLocalMatch = true;
              break;
            }
          }

          // If we've matched and replaced a local message, don't trigger animations
          // by using the same timestamp as the local message
          const merged = {
            ...previous,
            ...msg,
            content: msg.deleted ? "Message deleted" : msg.content,
            image: msg.image !== null && msg.image !== undefined
                ? msg.image
                : previous?.image || null,
          };

          prevMap.set(msg.id, merged);
        });

        return Array.from(prevMap.values()).sort(
            (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
        );
      });
    });

    client.activate();

    return () => client.deactivate();
  }, [chatId, currentUserId]);


  useEffect(() => {
    if (!chatId || !currentUserId) return;

    const client = API.createWebSocketClient(
        true, // listen to `/topic/chats`
        (data) => {
          if (data.chatId !== chatId) return;

          // when an update arrives on the current chat, recheck the participants
          API.getChatById(chatId).then((chatData) => {
            const isStillParticipant = chatData.chat.participants?.includes(currentUserId);
            if (!isStillParticipant) {
              alert("You have been removed from this group.");
              router.push("/");
            }
          }).catch(console.error);
        },
        false // no /topic/messages
    );

    client.activate();

    return () => client.deactivate();
  }, [chatId, currentUserId]);


  useEffect(() => {
    const handleFocusOrVisibility = () => markChatAsReadIfNeeded();
    window.addEventListener("focus", handleFocusOrVisibility);
    document.addEventListener("visibilitychange", handleFocusOrVisibility);
    markChatAsReadIfNeeded();
    return () => {
      window.removeEventListener("focus", handleFocusOrVisibility);
      document.removeEventListener("visibilitychange", handleFocusOrVisibility);
    };
  }, [messages, chatId, currentUserId]);

  const markChatAsReadIfNeeded = () => {
    const lastMsg = messages[messages.length - 1];
    const isLastFromOtherUser = lastMsg && lastMsg.sender !== currentUserId;
    if (document.visibilityState === "visible" && document.hasFocus() && chatId && currentUserId && messages.length > 0 && isLastFromOtherUser) {
      API.markChatAsRead(chatId).catch(console.error);
    }
  };

  /**
   * Handles sending a message in the chat.
   * @param {Event} e - The event triggered when sending the message.
   *
   * @function handleSendMessage
   * @returns {void} This function does not return anything.
   */
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() && !attachedImage) return;

    try {
      setSendingMessage(true);

      const localId = "local-" + Date.now();

      const tempMessage = {
        id: localId,
        content: newMessage.trim(),
        sender: currentUserId,
        timestamp: new Date().toISOString(),
        read: false,
        image: attachedImage || null,
      };

      // Add the temp message to state
      setMessages((prev) => [...prev, tempMessage]);

      // Reset form state immediately
      setNewMessage("");
      setAttachedImage(null);
      if (fileInputRef.current) fileInputRef.current.value = null;

      // Set a flag to prevent duplicate scroll animations
      // when the real message comes back from websocket
      const messageTimestamp = new Date().getTime();
      alreadyFetchedImages.current.add(localId);

      // Send to backend
      await API.sendMessage(chatId, tempMessage.content, currentUserId, attachedImage);

      // Focus the input field again
      setTimeout(() => inputRef.current?.focus(), 0);

    } catch (err) {
      console.error("Error sending message:", err);
      setError("Error sending message:");
    } finally {
      setSendingMessage(false);
    }
  };


  /**
   * Handles the change of an attached file.
   * @param {Event} e - The event triggered when a file is selected.
   *
   * @function handleFileChange
   * @returns {void} This function does not return anything.
   */
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result.split(",")[1];
      setAttachedImage(base64);
    };
    reader.readAsDataURL(file);
  };

  /**
   * Handles the selection of an emoji.
   * @param {Object} emoji - The selected emoji.
   * @param {string} emoji.native - The native representation of the emoji.
   *
   * @function handleSelectEmoji
   * @returns {void} This function does not return anything.
   */
  const handleSelectEmoji = (emoji) => {
    setNewMessage((prev) => prev + emoji.native);
    inputRef.current?.focus();
  };

  /**
   * Removes an attachment (image) from the message.
   * @function handleRemoveAttachment
   * @returns {void} This function does not return anything.
   */
  const handleRemoveAttachment = () => {
    setAttachedImage(null);
    fileInputRef.current.value = null;
  };



  /**
   * Handles the editing of a message.
   * @function handleEditMessage
   * @param {Object} msg - The message to be edited.
   * @returns {void} This function does not return anything.
   */
  const handleEditMessage = (msg) => {
    setEditingId(msg.id);
    setEditedText(msg.content);
    setOpenMenuId(null);
  };

  /**
   * Submits the edited message.
   * @function submitEdit
   * @param {Event} e - The event triggered when submitting the edit.
   * @param {string} messageId - The ID of the message being edited.
   * @returns {void} This function does not return anything.
   */
  const submitEdit = async (e, messageId) => {
    e.preventDefault();
    if (!editedText.trim()) return;

    try {
      await API.updateMessage(chatId, messageId, editedText.trim());
      setEditingId(null);
      setEditedText("");
    } catch (err) {
      console.error("Error while editing:", err);
    }
  };


  /**
   * Handles the deletion of a message.
   * @function handleDeleteMessage
   * @param {Object} msg - The message to be deleted.
   * @returns {void} This function does not return anything.
   */
  const handleDeleteMessage = async (msg) => {
    if (!msg?.id) return;
    try {
      await API.deleteMessage(chatId, msg.id);
      setMessages((prev) =>
          prev.map((m) => (m.id === msg.id ? { ...m, deleted: true, content: "Message deleted", image: null } : m))
      );
    } catch (err) {
      console.error("Error while deleting:", err);
    } finally {
      setOpenMenuId(null);
    }
  };

  /**
   * Toggles the visibility of the menu.
   * @function toggleMenu
   * @param {string} id - The ID of the menu to be toggled.
   * @returns {void} This function does not return anything.
   */
  const toggleMenu = (id) => {
    setOpenMenuId((prev) => (prev === id ? null : id));
  };

  /**
   * Checks if the user is allowed to delete a message.
   * @function canDeleteMessage
   * @param {Object} msg - The message to be checked.
   * @returns {boolean} - Whether the user can delete the message.
   */
  const canDeleteMessage = (msg) => {
    const isGroup = chat?.type === "group";
    const isMine = msg.sender === currentUserId;
    const creatorId = chat?.admin?.creator;
    const senderRole = Object.entries(chat?.admin || {}).find(([, uid]) => uid === msg.sender)?.[0];
    const currentUserRole = Object.entries(chat?.admin || {}).find(([, uid]) => uid === currentUserId)?.[0];

    if (!isGroup) return isMine;

    if (currentUserId === creatorId) return true; // creator can do everything
    if (currentUserRole) {
      console.log(currentUserRole);
      // admin can delete normal members and other admins (not the creator)
      return msg.sender !== creatorId;
    }

    return isMine; // normal member can only delete its own
  };


  useEffect(() => {
    const id = localStorage.getItem("currentUserId");
    if (!id) return setError("User not authenticated");
    setCurrentUserId(id);
  }, []);


  /**
   * Scrolls to the bottom of the message list when messages are loaded or changed
   * @function useEffect
   * @returns {void} This function does not return anything.
   */

// For initial
  useEffect(() => {
    if (!loading) {
      // Scroll to bottom immediately without animation
      scrollToBottom('auto');
    }
  }, [loading]);

// Modifica 3: Aggiungi questa funzione helper per lo scroll
  const scrollToBottom = (behavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    if (!loading && messages.length > 0) {
      scrollToBottom();
    }
  }, [loading]);


  // For msgs sent
  useEffect(() => {
    if (messages.length > 0) {
      // Prima nascondi i messaggi
      const chatContainer = document.querySelector('.chat-container');
      if (chatContainer) {
        chatContainer.style.opacity = '0';

        // Poi dopo un breve delay, scorra alla fine e rendi visibile con animazione
        setTimeout(() => {
          scrollToBottom();
          chatContainer.style.opacity = '1';
          chatContainer.style.transition = 'opacity 0.3s ease-in';
        }, 100);
      }
    }
  }, [messages]);


  useEffect(() => {
    if (sendingMessage) {
      scrollToBottom('smooth');
    }
  }, [messages, sendingMessage]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredMessages([]);
      return;
    }

    const filtered = messages.filter((msg) =>
      msg.content.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredMessages(filtered);
  }, [searchQuery, messages]);

  if (loading) return (
      <div style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f9fafb",
        position: "fixed",
        top: 0,
        left: 0
      }}>
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "12px"
        }}>
          <div className="loading-spinner" style={{
            width: "40px",
            height: "40px",
            border: "4px solid #f3f3f3",
            borderTop: "4px solid #990033",
            borderRadius: "50%",
            animation: "spin 1s linear infinite"
          }} />
          <p style={{ color: "#6b7280", fontSize: "14px" }}>Loading chat...</p>
        </div>
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
  );
  if (error) return <div className="text-red-500 p-4">{error}</div>;

  const isGroup = chat?.type === "group";
  const currentUserIdStr = String(currentUserId);
  const participants = Array.isArray(chat?.participants) ? chat.participants.map(String) : [];
  const otherUser = !isGroup ? participants.find((pid) => pid !== currentUserIdStr) : null;
  const chatAvatar = isGroup ? getAvatarSrc(chat?.avatar, "G") : getAvatarSrc(usersMap[otherUser]?.user?.avatar, "U");

  const messageGroups = Object.entries(
      messages.reduce((acc, msg) => {
        const date = new Date(msg.timestamp || Date.now()).toDateString();
        acc[date] = acc[date] || [];
        acc[date].push(msg);
        return acc;
      }, {})
  );


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
        {/* Header rosso fisso */}
        <header className="page-header" style={{
          padding: "4px 8px",
          borderBottom: "1px solid #e5e7eb",
          fontWeight: "bold",
          fontSize: "1.125rem",
          backgroundColor: "#990033",
          flexShrink: 0
        }}>
          <div className="container mx-auto flex items-center justify-between">
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem"
            }}>
              <button id = "back-button"
                      onClick={() => router.push("/")}
                      style={{
                        background: "none",
                        border: "none",
                        color: "white",
                        cursor: "pointer",
                        padding: "8px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}
              >
                <ArrowLeft size={24} />
              </button>
              <h1 style={{
                fontSize: "1.5rem",
                fontWeight: "bold",
                color: "white"
              }}>
                Chats
              </h1>
            </div>
          </div>
        </header>

        {/* Barra bianca fissa con immagine + nome + info */}
        <div
          style={{
            backgroundColor: "#f2f2f2",
            padding: "12px 16px",
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: "0.75rem",
            position: "relative",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              flexGrow: 1,
              alignItems: "center",
              cursor: showSearch ? "default" : "pointer",
              gap: "0.75rem",
            }}
            onClick={(e) => {
              if (!showSearch && isGroup) {
                e.preventDefault();
                router.push(`/group-info/${chatId}`);
              } else if (!showSearch && !isGroup) {
                e.preventDefault();
                router.push(`/user/${otherUser}`);
              }
            }}
          >
            <img
              src={chatAvatar}
              alt={title}
              className="user-avatar"
              style={{
                height: "40px",
                width: "40px",
                borderRadius: "50%",
                objectFit: "cover",
              }}
            />
            {!showSearch ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                }}
              >
                <span
                  style={{
                    color: "black",
                    fontSize: "18px",
                    fontWeight: 600,
                  }}
                >
                  {title}
                </span>
                <span
                  style={{
                    fontSize: "12px",
                    color: "#6b7280",
                    fontWeight: "normal",
                  }}
                >
                  {isGroup
                    ? `${participants.length || 0} participants`
                    : usersMap[otherUser]?.user?.bio || ""}
                </span>
              </div>
            ) : (
              <div style={{ flexGrow: 1 }}>
                <input
                  ref={searchInputRef}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search in messages"
                  autoFocus
                  style={{
                    width: "99%",
                    padding: "8px 12px",
                    borderRadius: "16px",
                    border: "1px solid #d1d5db",
                    fontSize: "14px",
                  }}
                />
              </div>
            )}
          </div>

          <button
            onClick={() => {
              setShowSearch(!showSearch);
              if (!showSearch) {
                setTimeout(() => searchInputRef.current?.focus(), 100);
              } else {
                setSearchQuery("");
              }
            }}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {showSearch ? (
              <X size={20} color="#6b7280" />
            ) : (
              <Search size={20} color="#6b7280" />
            )}
          </button>
        </div>

        {/* Contenuto principale scorrevole */}
        <main style={{
          display: "flex",
          flexDirection: "column",
          flexGrow: 1,
          height: 0,
          overflow: "hidden"
        }}>
          <div
              className="chat-container"
              style={{
                padding: "16px",
                opacity: messages.length > 0 ? "1" : "0",
                transition: "opacity 0.5s ease",
                overflowY: "auto",
                flex: 1
              }}
          >
            <div className="message-list px-4 py-2">
  {searchQuery.trim() ? (
    filteredMessages.length > 0 ? (
      <div>
        <div
          className="search-results-info"
          style={{
            textAlign: "center",
            padding: "10px",
            color: "#6b7280",
            fontSize: "14px",
            marginBottom: "16px",
          }}
        >
          Found {filteredMessages.length} message
          {filteredMessages.length !== 1 ? "s" : ""} containing "
          {searchQuery}"
        </div>
        <div className="space-y-3">
          {filteredMessages.map((msg) => {
            const isMine = msg.sender === currentUserId;
            const senderName =
              usersMap[msg.sender]?.user?.username ||
              usersMap[msg.sender]?.username ||
              "User";

            return (
              <div
                key={msg.id}
                className={`message relative ${
                  isMine ? "message-sent" : "message-received"
                }`}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "10px",
                  justifyContent: isMine
                    ? "flex-end"
                    : "flex-start",
                }}
              >
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "50%",
                    overflow: "hidden",
                    cursor: "pointer",
                    marginTop: "10px",
                    flexShrink: 0,
                  }}
                  onClick={() =>
                    router.push(`/user/${msg.sender}`)
                  }
                >
                  <img
                    src={getAvatarSrc(
                      usersMap[String(msg.sender)]?.avatar ||
                        usersMap[String(msg.sender)]?.user?.avatar,
                      "U"
                    )}
                    alt="avatar"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                </div>
                <div>
                  {isGroup && !isMine && (
                    <p
                      style={{
                        fontSize: "12px",
                        fontWeight: "bold",
                        marginBottom: "4px",
                        color: "#93c5fd",
                        cursor: "pointer",
                      }}
                      onClick={() =>
                        router.push(`/user/${msg.sender}`)
                      }
                    >
                      {senderName}
                    </p>
                  )}
                  <p
                    style={{
                      backgroundColor: "#990033",
                      color: "white",
                      padding: "8px 12px",
                      borderRadius: "12px",
                      maxWidth: "300px",
                      wordBreak: "break-word",
                    }}
                  >
                    {msg.content}
                  </p>
                  {msg.image && (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "center",
                      }}
                    >
                      <img
                        src={`data:image/png;base64,${msg.image}`}
                        alt="attachment"
                        onClick={() =>
                          setPreviewImage(
                            `data:image/png;base64,${msg.image}`
                          )
                        }
                        style={{
                          maxWidth: "100%",
                          maxHeight: "240px",
                          borderRadius: "4px",
                          objectFit: "cover",
                          marginTop: "8px",
                          cursor: "pointer",
                        }}
                      />
                    </div>
                  )}
                  <div
                    style={{
                      fontSize: "11px",
                      textAlign: "right",
                      marginTop: "2px",
                      display: "flex",
                      justifyContent: "flex-end",
                      alignItems: "center",
                      gap: "2px",
                      color: "#d1d5db",
                    }}
                  >
                    <span style={{ fontSize: "10px" }}>
                      {new Date(msg.timestamp).toLocaleTimeString(
                        [],
                        { hour: "2-digit", minute: "2-digit" }
                      )}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    ) : (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "200px",
          color: "#6b7280",
        }}
      >
        <Search size={48} strokeWidth={1} color="#d1d5db" />
        <p style={{ marginTop: "16px", fontSize: "16px" }}>
          No messages found
        </p>
      </div>
    )
  ) : (
    messageGroups.map(([date, msgs]) => (
                  <div key={date}>
                    <div className="message-date" style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "16px 0",
                      position: "relative"
                    }}>
                      <div style={{
                        position: "absolute",
                        width: "100%",
                        height: "1px",
                        backgroundColor: "#e5e7eb",
                        zIndex: 1
                      }} />
                      <span style={{
                        backgroundColor: "#f9fafb",
                        padding: "2px 8px",
                        borderRadius: "8px",
                        fontSize: "12px",
                        color: "#6b7280",
                        position: "relative",
                        zIndex: 2
                      }}>{date}</span>
                    </div>
                    <div className="space-y-3">
                      {msgs.map((msg) => {
                        const isMine = msg.sender === currentUserId;
                        const isDeleted = msg.deleted;
                        const senderName = usersMap[msg.sender]?.user?.username || usersMap[msg.sender]?.username || "User";
                        const canDelete = canDeleteMessage(msg);

                        return (
                            <div key={msg.id} className={`message relative ${isMine ? "message-sent" : "message-received"} ${isDeleted ? "message-deleted" : ""}`} style={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: "10px",
                              justifyContent: isMine ? "flex-end" : "flex-start"
                            }}>

                              <div
                                  style={{
                                    width: "28px",
                                    height: "28px",
                                    borderRadius: "50%",
                                    overflow: "hidden",
                                    cursor: "pointer",
                                    marginTop: "10px",
                                    flexShrink: 0

                                  }}
                                  onClick={() => router.push(`/user/${msg.sender}`)}
                              >
                                <img
                                    src={getAvatarSrc(usersMap[String(msg.sender)]?.avatar || usersMap[String(msg.sender)]?.user?.avatar, "U")}
                                    alt="avatar"
                                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                />
                              </div>


                              <div>
                                {!isDeleted && canDelete && (
                                    <div style={{
                                      position: "absolute",
                                      top: "1px",
                                      right: "1px",
                                      zIndex: 10
                                    }}>
                                      <button
                                          onClick={() => toggleMenu(msg.id)}
                                          style={{
                                            background: "none",
                                            border: "none",
                                            color: "white",
                                            borderRadius: "50%",
                                            padding: "0 8px",
                                            cursor: "pointer"
                                          }}
                                      >
                                        ⋮
                                      </button>
                                      {openMenuId === msg.id && (
                                          <div style={{
                                            position: "absolute",
                                            right: "0",
                                            marginTop: "2px",
                                            width: "160px",
                                            border: "1px solid #6b7280",
                                            borderRadius: "4px",
                                            boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
                                            zIndex: 50,
                                            background: "#374151",
                                            fontSize: "14px"
                                          }}>
                                            {msg.sender === currentUserId && (
                                                <button
                                                    onClick={() => handleEditMessage(msg)}
                                                    style={{
                                                      background: "none",
                                                      border: "none",
                                                      color: "white",
                                                      width: "100%",
                                                      textAlign: "left",
                                                      padding: "8px",
                                                      cursor: "pointer"
                                                    }}
                                                >
                                                  Edit message
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleDeleteMessage(msg)}
                                                style={{
                                                  background: "none",
                                                  border: "none",
                                                  color: "white",
                                                  width: "100%",
                                                  textAlign: "left",
                                                  padding: "8px",
                                                  cursor: "pointer"
                                                }}
                                            >
                                              Delete message
                                            </button>
                                          </div>
                                      )}
                                    </div>
                                )}

                                {!editingId || editingId !== msg.id ? (
                                    <>
                                      {!isDeleted && isGroup && !isMine && (
                                          <p style={{
                                            fontSize: "12px",
                                            fontWeight: "bold",
                                            marginBottom: "4px",
                                            color: "#93c5fd",
                                            cursor: "pointer"
                                          }}
                                             onClick={() => router.push(`/user/${msg.sender}`)}
                                          >
                                            {senderName}
                                          </p>
                                      )}
                                      <p>{msg.content}</p>
                                      {!isDeleted && msg.image && (
                                          <div style={{ display: "flex", justifyContent: "center" }}>
                                            <img
                                                src={`data:image/png;base64,${msg.image}`}
                                                alt="attachment"
                                                onClick={() => setPreviewImage(`data:image/png;base64,${msg.image}`)}
                                                style={{
                                                  maxWidth: "100%",
                                                  maxHeight: "240px",
                                                  borderRadius: "4px",
                                                  objectFit: "cover",
                                                  marginTop: "8px",
                                                  cursor: "pointer"
                                                }}
                                            />
                                          </div>
                                      )}
                                      {!isDeleted && (
                                          <div style={{
                                            fontSize: "11px",
                                            textAlign: "right",
                                            marginTop: "2px",
                                            display: "flex",
                                            justifyContent: "flex-end",
                                            alignItems: "center",
                                            gap: "2px",
                                            color: "#d1d5db",
                                          }}>
                                              <span style={{ fontSize: "10px" }}>
                                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                              </span>
                                                                                  {isMine && (
                                                                                      <>
                                                                                        {msg.read ? (
                                                                                            <span title="Read">
                                                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M18 6L9.1 15 4 9.9" />
                                                        <path d="M18 14L9.1 23 4 17.9" />
                                                      </svg>
                                                    </span>
                                                                                        ) : (
                                                                                            <span title="Delivered">
                                                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M18 6L9.1 15 4 9.9" />
                                                      </svg>
                                                    </span>
                                                  )}
                                                </>
                                            )}
                                          </div>
                                      )}
                                    </>
                                ) : (
                                    <form onSubmit={(e) => submitEdit(e, msg.id)}>
                                      <input
                                          type="text"
                                          value={editedText}
                                          onChange={(e) => setEditedText(e.target.value)}
                                          style={{
                                            width: "90%",
                                            padding: "4px",
                                            fontSize: "14px",
                                            border: "1px solid #d1d5db",
                                            borderRadius: "4px",
                                            color: "#000",
                                          }}
                                          autoFocus
                                      />
                                      <div style={{ display: "flex", marginTop: "4px" }}>
                                        <button
                                            type="submit"
                                            style={{
                                              background: "#4338ca",
                                              color: "white",
                                              padding: "6px 12px",
                                              borderRadius: "6px",
                                              fontSize: "13px",
                                              fontWeight: "500",
                                              boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                                              transition: "all 0.2s ease",
                                              cursor: "pointer",
                                              border: "none",
                                            }}
                                            onMouseOver={(e) => (e.currentTarget.style.background = "#3730a3")}
                                            onMouseOut={(e) => (e.currentTarget.style.background = "#4338ca")}
                                        >
                                          Save
                                        </button>

                                        <button
                                            type="button"
                                            style={{
                                              background: "#6b7280",
                                              color: "white",
                                              padding: "6px 12px",
                                              borderRadius: "6px",
                                              fontSize: "13px",
                                              fontWeight: "500",
                                              boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                                              transition: "all 0.2s ease",
                                              cursor: "pointer",
                                              border: "none",
                                              marginLeft: "8px",
                                            }}
                                            onClick={() => setEditingId(null)}
                                            onMouseOver={(e) => (e.currentTarget.style.background = "#4b5563")}
                                            onMouseOut={(e) => (e.currentTarget.style.background = "#6b7280")}
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    </form>
                                )}
                              </div>
                            </div>
                        );
                      })}
                    </div>
                  </div>
              )))}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Form per l'invio messaggi fisso in basso */}
          <div className="message-input-container" style={{
            padding: "16px",
            borderTop: "1px solid #e5e7eb",
            backgroundColor: "#fff",
            flexShrink: 0
          }}>
            <form
                id="message-input-form"
                onSubmit={handleSendMessage}
                className="message-input-form"
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
            >


              <input
                  id="message-input"
                  type="text"
                  ref={inputRef}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Write a message..."
                  className="message-input"
                  style={{
                    flex: 1,
                    border: "1px solid #d1d5db",
                    borderRadius: "16px",
                    padding: "10px 16px"
                  }}
                  disabled={sendingMessage}
              />

              <input
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  ref={fileInputRef}
                  onChange={handleFileChange}
              />

              <button
                  type="button"
                  onClick={() => setShowEmojiPicker((prev) => !prev)}
                  style={{ fontSize: "1.5rem", cursor: "pointer", background: "none", border: "none" }}
              >
                <Smile size={16} color="#990033" style={{ marginBottom: "1.5px" }} />

              </button>

              {showEmojiPicker && (
                  <div style={{ position: "absolute", bottom: "64px", right: "8px", zIndex: 50 }}>
                    <Picker data={data} onEmojiSelect={handleSelectEmoji} />
                  </div>
              )}

              <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Attach image"
                  style={{
                    fontSize: "1.2rem",
                    background: "none",
                    border: "none",
                    cursor: "pointer"
                  }}
              >
                <Paperclip size={16} color="#6b7280" style={{ marginRight: 4 }} />
              </button>

              {attachedImage && (
                  <div style={{ marginLeft: "0.5rem", display: "flex", alignItems: "center" }}>
                    <img
                        src={`data:image/png;base64,${attachedImage}`}
                        alt="preview"
                        style={{
                          width: "40px",
                          height: "40px",
                          borderRadius: "4px",
                          objectFit: "cover"
                        }}
                    />
                    <button
                        onClick={handleRemoveAttachment}
                        type="button"
                        title="Remove"
                        style={{
                          fontSize: "0.8rem",
                          color: "#dc2626",
                          background: "none",
                          border: "none",
                          cursor: "pointer"
                        }}
                    >
                      <X size={16} color="#6b7280" style={{ marginRight: 4 }} />

                    </button>
                  </div>
              )}

              <button
                  id="message-send-button"
                  type="submit"
                  style={{
                    backgroundColor: "#990033",
                    color: "white",
                    border: "none",
                    borderRadius: "0.375rem",
                    padding: "0.5rem 1.5rem",
                    fontSize: "0.875rem",
                    fontWeight: "500",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    cursor: "pointer",
                    transition: "background-color 0.2s ease"
                  }}
                  disabled={sendingMessage || (!newMessage.trim() && !attachedImage)}
              >
                Send
              </button>
            </form>
          </div>
        </main>

        {/* Image preview modal */}
        {previewImage && (
            <div
                onClick={() => setPreviewImage(null)}
                style={{
                  position: "fixed",
                  top: 0, left: 0, right: 0, bottom: 0,
                  backgroundColor: "rgba(0,0,0,0.8)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 1000,
                  cursor: "pointer"
                }}
            >
              <img
                  src={previewImage}
                  alt="Preview"
                  style={{
                    maxWidth: "90%",
                    maxHeight: "90%",
                    borderRadius: "8px"
                  }}
              />
            </div>
        )}


      </div>
  );


}