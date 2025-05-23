"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import API from "@/lib/api";
import {ArrowLeft} from "lucide-react";

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
    const [error, setError] = useState(null);
    const [initialMessage, setInitialMessage] = useState("");
    const [groupTitle, setGroupTitle] = useState("");
    const [groupAvatarFile, setGroupAvatarFile] = useState(null);

    const handleGroupAvatarChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = reader.result.split(",")[1];
                setGroupAvatarFile(base64);
            };
            reader.readAsDataURL(file);
        }
    };


    const [showAddFriendModal, setShowAddFriendModal] = useState(false);
    const [searchUserId, setSearchUserId] = useState("");
    const [searchResult, setSearchResult] = useState(null);
    const [friendRequestMessage, setFriendRequestMessage] = useState("");

    const [friendRequests, setFriendRequests] = useState([]);
    const [handlingRequestId, setHandlingRequestId] = useState(null);

    const router = useRouter();

    const getAvatarSrc = (avatar) => {
        return avatar ? `data:image/png;base64,${avatar}` : "https://dummyimage.com/40x40/000/fff&text=P";
    };

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
                const requests = await API.getFriendRequestsList();
                setFriends(friendsList);
                setFriendRequests(requests);
                setLoading(false);
            } catch (err) {
                console.error("Error in loading:", err);
                setError("An error occurred in the upload. Please try again later.");
                setLoading(false);
            }
        };
        fetchData();
    }, []);


    const activeFriends = friends.filter(friend => friend.friendshipStatus === "active");

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
                return prevSelected.filter(id => id !== userId);
            } else {
                if (chatType === "individual" && prevSelected.length === 1) {
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
        if (selectedUsers.length === 0) {
            setError("Select at least one friend for the chat.");
            return;
        }
        if (!initialMessage.trim()) {
            setError("You need to write a message to create the chat.");
            return;
        } else {
            handleCreateChat();
        }
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
            if (chatType === "individual") {
                const friendId = selectedUsers[0];
                if (friends.some(friend => friend.id === friendId)) {
                    const result = await API.createIndividualChatIfNotExists(friendId, initialMessage);
                    if (result.alreadyExists) {
                        setError("A chat with this user already exists.");
                        setTimeout(() => setError(null), 3000);
                        setCreating(false);
                        return;
                    }
                    router.push("../");
                } else {
                    setError("You are not friends with this user yet.");
                    setTimeout(() => setError(null), 3000);
                    setCreating(false);
                }
                return;
            }
            if (chatType === "group") {
                if (!initialMessage.trim() || selectedUsers.length === 0 || !groupTitle.trim()) {
                    setError("Complete all fields to create the group.");
                    setCreating(false);
                    return;
                }

                const creatorId = await API.getCurrentUserId();
                await API.createGroupChat(selectedUsers, creatorId, groupTitle, initialMessage, groupAvatarFile);
                router.push("/");
            }
        } catch (err) {
            console.error("Error creating the chat:", err);
            setError("Error creating the chat. Please try again later.");
            setCreating(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case "active": return "bg-green-500";
            case "pending": return "bg-yellow-500";
            case "blocked": return "bg-red-500";
            default: return "bg-gray-500";
        }
    };

    /**
     * Handles the search for a user by their ID.
     * Sends a request to the backend to retrieve the user's data and updates the search result.
     * Displays a message if the user is not found.
     *
     * @function handleSearchUser
     * @returns {Promise<void>} This function does not return anything.
     */
    const handleSearchUser = async () => {
        try {
            const result = await API.getUserById(searchUserId);
            setSearchResult(result);
            setFriendRequestMessage("");
        } catch (error) {
            console.error("Error in user search:", error);
            setFriendRequestMessage("User not found");
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-xl font-semibold">Loading...</div>
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
            {/* Header */}
            <header style={{
                backgroundColor: "#990033",
                padding: "0.1rem 1.5rem",
                color: "white",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1px solid #FFFFFF"
            }}>
                <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem"
                }}>
                    <button
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
                        fontWeight: "bold"
                    }}>
                        New Chat
                    </h1>
                </div>

                <img
                    src="https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/Milano-Bicocca_University_logo_2.svg/2095px-Milano-Bicocca_University_logo_2.svg.png"
                    width="60"
                    alt="logo"
                    style={{ borderRadius: "4px" }}
                />
            </header>

            {/* Main content */}
            <main style={{
                flex: 1,
                padding: "1.5rem",
                overflowY: "auto"
            }}>
                <div style={{
                    maxWidth: "800px",
                    margin: "0 auto",
                    backgroundColor: "white",
                    borderRadius: "0.5rem",
                    boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
                    overflow: "hidden"
                }}>
                    {/* Chat Type Selection */}
                    <div style={{
                        padding: "1.5rem",
                        borderBottom: "1px solid #e5e7eb"
                    }}>
                        <h2 style={{
                            fontSize: "1.25rem",
                            fontWeight: "600",
                            color: "#1f2937",
                            marginBottom: "1rem"
                        }}>
                            Type of chat
                        </h2>
                        <div style={{
                            display: "flex",
                            gap: "1rem"
                        }}>
                            <button
                                onClick={() => {
                                    setChatType("individual");
                                    if (selectedUsers.length > 1) setSelectedUsers([selectedUsers[0]]);
                                }}
                                style={{
                                    backgroundColor: chatType === "individual" ? "#990033" : "white",
                                    color: chatType === "individual" ? "white" : "#374151",
                                    border: chatType === "individual" ? "none" : "1px solid #d1d5db",
                                    borderRadius: "0.375rem",
                                    padding: "0.625rem 1rem",
                                    fontSize: "0.875rem",
                                    fontWeight: "500",
                                    cursor: "pointer",
                                    transition: "all 0.2s ease"
                                }}
                                onMouseEnter={(e) => {
                                    if (chatType !== "individual") {
                                        e.currentTarget.style.backgroundColor = "#f3f4f6";
                                    } else {
                                        e.currentTarget.style.backgroundColor = "#660022";
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (chatType !== "individual") {
                                        e.currentTarget.style.backgroundColor = "white";
                                    } else {
                                        e.currentTarget.style.backgroundColor = "#990033";
                                    }
                                }}
                            >
                                Individual
                            </button>
                            <button
                                onClick={() => setChatType("group")}
                                style={{
                                    backgroundColor: chatType === "group" ? "#990033" : "white",
                                    color: chatType === "group" ? "white" : "#374151",
                                    border: chatType === "group" ? "none" : "1px solid #d1d5db",
                                    borderRadius: "0.375rem",
                                    padding: "0.625rem 1rem",
                                    fontSize: "0.875rem",
                                    fontWeight: "500",
                                    cursor: "pointer",
                                    transition: "all 0.2s ease"
                                }}
                                onMouseEnter={(e) => {
                                    if (chatType !== "group") {
                                        e.currentTarget.style.backgroundColor = "#f3f4f6";
                                    } else {
                                        e.currentTarget.style.backgroundColor = "#660022";
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (chatType !== "group") {
                                        e.currentTarget.style.backgroundColor = "white";
                                    } else {
                                        e.currentTarget.style.backgroundColor = "#990033";
                                    }
                                }}
                            >
                                Group
                            </button>
                        </div>
                    </div>

                    {/* Individual Chat Options */}
                    {chatType === "individual" && selectedUsers.length === 1 && (
                        <div style={{
                            padding: "1.5rem",
                            borderBottom: "1px solid #e5e7eb"
                        }}>
                            <div style={{
                                marginBottom: "1rem"
                            }}>
                                <label
                                    htmlFor="initialMessage"
                                    style={{
                                        display: "block",
                                        marginBottom: "0.5rem",
                                        fontSize: "0.875rem",
                                        color: "#4b5563",
                                        fontWeight: "500"
                                    }}
                                >
                                    Initial message
                                </label>
                                <input
                                    type="text"
                                    id="initialMessage"
                                    value={initialMessage}
                                    onChange={(e) => setInitialMessage(e.target.value)}
                                    placeholder="Initial Message..."
                                    style={{
                                        width: "100%",
                                        padding: "0.625rem",
                                        border: "1px solid #d1d5db",
                                        borderRadius: "0.375rem",
                                        fontSize: "0.875rem",
                                        backgroundColor: "white",
                                        boxSizing: "border-box"
                                    }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Group Chat Options */}
                    {chatType === "group" && (
                        <div style={{
                            padding: "1.5rem",
                            borderBottom: "1px solid #e5e7eb"
                        }}>
                            <div style={{
                                marginBottom: "1rem"
                            }}>
                                <label
                                    htmlFor="groupTitle"
                                    style={{
                                        display: "block",
                                        marginBottom: "0.5rem",
                                        fontSize: "0.875rem",
                                        color: "#4b5563",
                                        fontWeight: "500"
                                    }}
                                >
                                    Group Title
                                </label>
                                <input
                                    type="text"
                                    id="groupTitle"
                                    value={groupTitle}
                                    onChange={(e) => setGroupTitle(e.target.value)}
                                    placeholder="Enter the name of the group..."
                                    style={{
                                        width: "100%",
                                        padding: "0.625rem",
                                        border: "1px solid #d1d5db",
                                        borderRadius: "0.375rem",
                                        fontSize: "0.875rem",
                                        backgroundColor: "white",
                                        boxSizing: "border-box"
                                    }}
                                />
                            </div>
                            <div style={{
                                marginBottom: "1rem"
                            }}>
                                <label
                                    htmlFor="initialMessage"
                                    style={{
                                        display: "block",
                                        marginBottom: "0.5rem",
                                        fontSize: "0.875rem",
                                        color: "#4b5563",
                                        fontWeight: "500"
                                    }}
                                >
                                    Initial message
                                </label>
                                <input
                                    type="text"
                                    id="initialMessage"
                                    value={initialMessage}
                                    onChange={(e) => setInitialMessage(e.target.value)}
                                    placeholder="Write your first message..."
                                    style={{
                                        width: "100%",
                                        padding: "0.625rem",
                                        border: "1px solid #d1d5db",
                                        borderRadius: "0.375rem",
                                        fontSize: "0.875rem",
                                        backgroundColor: "white",
                                        boxSizing: "border-box"
                                    }}
                                />
                            </div>
                            <div style={{
                                marginBottom: "1rem"
                            }}>
                                <label
                                    style={{
                                        display: "block",
                                        marginBottom: "0.5rem",
                                        fontSize: "0.875rem",
                                        color: "#4b5563",
                                        fontWeight: "500"
                                    }}
                                >
                                    Select Image
                                </label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleGroupAvatarChange}
                                    style={{
                                        width: "100%",
                                        padding: "0.5rem",
                                        border: "1px solid #d1d5db",
                                        borderRadius: "0.375rem",
                                        fontSize: "0.875rem",
                                        backgroundColor: "white"
                                    }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Friends Section */}
                    <div style={{
                        padding: "1.5rem"
                    }}>
                        <div style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            marginBottom: "1rem"
                        }}>
                            <h2 style={{
                                fontSize: "1.25rem",
                                fontWeight: "600",
                                color: "#1f2937"
                            }}>
                                Your friends
                            </h2>
                            <button
                                onClick={() => setShowAddFriendModal(true)}
                                style={{
                                    backgroundColor: "white",
                                    color: "#990033",
                                    border: "2px solid #990033",
                                    borderRadius: "0.375rem",
                                    padding: "0.5rem 1rem",
                                    fontSize: "0.875rem",
                                    fontWeight: "500",
                                    cursor: "pointer",
                                    transition: "all 0.2s ease"
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = "#f9f9f9";
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = "white";
                                }}
                            >
                                Add Friend
                            </button>
                        </div>

                        {/* Friend Requests */}
                        {friendRequests.length > 0 && (
                            <div style={{
                                marginBottom: "1.5rem",
                                padding: "1rem",
                                border: "1px solid #e5e7eb",
                                borderRadius: "0.375rem",
                                backgroundColor: "#f9fafb"
                            }}>
                                <h3 style={{
                                    fontSize: "1rem",
                                    fontWeight: "600",
                                    color: "#374151",
                                    marginBottom: "0.75rem"
                                }}>
                                    Friend Requests Received:
                                </h3>

                                {friendRequests.map((user) => (
                                    <div
                                        key={user.id}
                                        style={{
                                            padding: "0.75rem",
                                            marginBottom: "0.75rem",
                                            border: "1px solid #e5e7eb",
                                            borderRadius: "0.375rem",
                                            backgroundColor: "white"
                                        }}
                                    >
                                        <div style={{
                                            display: "flex",
                                            alignItems: "center",
                                            position: "relative",
                                            marginBottom: "0.75rem"
                                        }}>
                                            <div style={{ position: "relative", marginRight: "0.75rem" }}>
                                                <img
                                                    src={getAvatarSrc(user.avatar)}
                                                    alt={user.username || user.name}
                                                    style={{
                                                        width: "40px",
                                                        height: "40px",
                                                        borderRadius: "50%",
                                                        objectFit: "cover"
                                                    }}
                                                />
                                                <span
                                                    style={{
                                                        position: "absolute",
                                                        bottom: "0",
                                                        right: "0",
                                                        height: "10px",
                                                        width: "10px",
                                                        backgroundColor: "#22c55e",
                                                        borderRadius: "50%",
                                                        border: "2px solid white"
                                                    }}
                                                ></span>
                                            </div>
                                            <span style={{
                                                fontSize: "0.875rem",
                                                fontWeight: "500",
                                                color: "#1f2937"
                                            }}>
                      {user.username || user.name}
                    </span>
                                        </div>

                                        <div style={{
                                            display: "flex",
                                            gap: "0.5rem"
                                        }}>
                                            <button
                                                onClick={async () => {
                                                    setHandlingRequestId(user.id);
                                                    try {
                                                        await API.acceptFriendRequest(user.id);
                                                        const updatedRequests = friendRequests.filter(req => req.id !== user.id);
                                                        setFriendRequests(updatedRequests);
                                                        setFriends(prev => [...prev, { ...user, friendshipStatus: "active" }]);
                                                    } catch (err) {
                                                        console.error("Error in acceptance:", err);
                                                    } finally {
                                                        setHandlingRequestId(null);
                                                    }
                                                }}
                                                disabled={handlingRequestId === user.id}
                                                style={{
                                                    backgroundColor: "#10b981",
                                                    color: "white",
                                                    border: "none",
                                                    borderRadius: "0.375rem",
                                                    padding: "0.5rem 0.75rem",
                                                    fontSize: "0.75rem",
                                                    fontWeight: "500",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "0.25rem",
                                                    cursor: handlingRequestId === user.id ? "not-allowed" : "pointer",
                                                    opacity: handlingRequestId === user.id ? 0.7 : 1,
                                                    transition: "all 0.2s ease"
                                                }}
                                            >
                                                ✔ Accept
                                            </button>
                                            <button
                                                onClick={async () => {
                                                    setHandlingRequestId(user.id);
                                                    try {
                                                        await API.rejectFriendRequest(user.id);
                                                        const updatedRequests = friendRequests.filter(req => req.id !== user.id);
                                                        setFriendRequests(updatedRequests);
                                                    } catch (err) {
                                                        console.error("Error in rejection:", err);
                                                    } finally {
                                                        setHandlingRequestId(null);
                                                    }
                                                }}
                                                disabled={handlingRequestId === user.id}
                                                style={{
                                                    backgroundColor: "#ef4444",
                                                    color: "white",
                                                    border: "none",
                                                    borderRadius: "0.375rem",
                                                    padding: "0.5rem 0.75rem",
                                                    fontSize: "0.75rem",
                                                    fontWeight: "500",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "0.25rem",
                                                    cursor: handlingRequestId === user.id ? "not-allowed" : "pointer",
                                                    opacity: handlingRequestId === user.id ? 0.7 : 1,
                                                    transition: "all 0.2s ease"
                                                }}
                                            >
                                                ✖ Reject
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Error Message */}
                        {error && (
                            <div style={{
                                backgroundColor: "#fee2e2",
                                border: "1px solid #f87171",
                                color: "#b91c1c",
                                padding: "0.75rem 1rem",
                                borderRadius: "0.375rem",
                                marginBottom: "1rem",
                                fontSize: "0.875rem"
                            }}>
                                {error}
                            </div>
                        )}

                        {/* Friends List */}
                        <h3 style={{
                            fontSize: "1rem",
                            fontWeight: "500",
                            color: "#4b5563",
                            marginBottom: "0.75rem"
                        }}>
                            Your friends:
                        </h3>

                        <div style={{
                            border: "1px solid #e5e7eb",
                            borderRadius: "0.375rem",
                            overflow: "hidden"
                        }}>
                            {activeFriends.length === 0 ? (
                                <div style={{
                                    padding: "1rem",
                                    textAlign: "center",
                                    color: "#6b7280",
                                    fontSize: "0.875rem"
                                }}>
                                    You do not have any friends yet
                                </div>
                            ) : (
                                activeFriends.map(user => (
                                    <div
                                        key={user.id}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            padding: "0.75rem 1rem",
                                            borderBottom: "1px solid #e5e7eb",
                                            backgroundColor: selectedUsers.includes(user.id) ? "#f3f4f6" : "white",
                                            transition: "background-color 0.2s ease"
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            id={`user-${user.id}`}
                                            checked={selectedUsers.includes(user.id)}
                                            onChange={() => handleUserToggle(user.id)}
                                            style={{
                                                width: "1.25rem",
                                                height: "1.25rem",
                                                borderRadius: "0.25rem",
                                                borderColor: "#d1d5db",
                                                accentColor: "#990033",
                                                cursor: "pointer"
                                            }}
                                            disabled={chatType === "individual" && selectedUsers.length === 1 && !selectedUsers.includes(user.id)}
                                        />
                                        <label
                                            htmlFor={`user-${user.id}`}
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                marginLeft: "0.75rem",
                                                cursor: "pointer",
                                                flex: 1
                                            }}
                                        >
                                            <img
                                                src={getAvatarSrc(user.avatar)}
                                                alt={user.username || user.name}
                                                style={{
                                                    width: "40px",
                                                    height: "40px",
                                                    borderRadius: "50%",
                                                    objectFit: "cover",
                                                    marginRight: "0.75rem"
                                                }}
                                            />
                                            <div>
                                                <p style={{
                                                    fontSize: "0.875rem",
                                                    fontWeight: "500",
                                                    color: "#1f2937",
                                                    marginBottom: "0.25rem"
                                                }}>
                                                    {user.username || user.name}
                                                </p>
                                                <div style={{
                                                    display: "flex",
                                                    alignItems: "center"
                                                }}>
                        <span style={{
                            width: "0.5rem",
                            height: "0.5rem",
                            borderRadius: "50%",
                            backgroundColor: "#10b981",
                            marginRight: "0.5rem"
                        }}></span>
                                                    <span style={{
                                                        fontSize: "0.75rem",
                                                        color: "#6b7280",
                                                        textTransform: "capitalize"
                                                    }}>
                          Friend
                        </span>
                                                </div>
                                            </div>
                                        </label>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div style={{
                        padding: "1.5rem",
                        borderTop: "1px solid #e5e7eb",
                        display: "flex",
                        justifyContent: "flex-end",
                        gap: "0.75rem"
                    }}>
                        <button
                            onClick={() => router.push("/")}
                            style={{
                                backgroundColor: "white",
                                color: "#374151",
                                border: "1px solid #d1d5db",
                                borderRadius: "0.375rem",
                                padding: "0.625rem 1rem",
                                fontSize: "0.875rem",
                                fontWeight: "500",
                                cursor: "pointer",
                                transition: "background-color 0.2s ease"
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = "#f3f4f6";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = "white";
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            id = "create-chat-button"
                            onClick={handleButtonCreateChat}
                            style={{
                                backgroundColor: "#990033",
                                color: "white",
                                border: "none",
                                borderRadius: "0.375rem",
                                padding: "0.625rem 1rem",
                                fontSize: "0.875rem",
                                fontWeight: "500",
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
                            {creating ? "Creating..." : "Create Chat"}
                        </button>
                    </div>
                </div>
            </main>

            {/* Add Friend Modal */}
            {showAddFriendModal && (
                <div style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: "rgba(0, 0, 0, 0.6)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 50
                }}>
                    <div style={{
                        backgroundColor: "white",
                        padding: "1.5rem",
                        borderRadius: "0.5rem",
                        width: "90%",
                        maxWidth: "400px",
                        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)"
                    }}>
                        <h3 style={{
                            fontSize: "1.25rem",
                            fontWeight: "600",
                            color: "#1f2937",
                            marginBottom: "1rem",
                            textAlign: "center"
                        }}>
                            Add a friend
                        </h3>

                        <div style={{
                            marginBottom: "1rem"
                        }}>
                            <input
                                type="text"
                                value={searchUserId}
                                onChange={(e) => setSearchUserId(e.target.value)}
                                placeholder="Enter user ID"
                                style={{
                                    width: "100%",
                                    padding: "0.625rem",
                                    border: "1px solid #d1d5db",
                                    borderRadius: "0.375rem",
                                    fontSize: "0.875rem",
                                    backgroundColor: "white",
                                    boxSizing: "border-box",
                                    marginBottom: "0.5rem"
                                }}
                            />
                            <button
                                onClick={handleSearchUser}
                                style={{
                                    backgroundColor: "#990033",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "0.375rem",
                                    padding: "0.625rem 1rem",
                                    fontSize: "0.875rem",
                                    fontWeight: "500",
                                    width: "100%",
                                    cursor: "pointer",
                                    transition: "background-color 0.2s ease",
                                    marginBottom: "1rem"
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = "#660022";
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = "#990033";
                                }}
                            >
                                Search User
                            </button>
                        </div>

                        {searchResult && (
                            <div style={{
                                padding: "0.75rem",
                                border: "1px solid #d1d5db",
                                borderRadius: "0.375rem",
                                marginBottom: "1rem"
                            }}>
                                <p style={{
                                    fontWeight: "500",
                                    color: "#1f2937",
                                    marginBottom: "0.25rem"
                                }}>
                                    {searchResult.username || searchResult.name}
                                </p>
                                <p style={{
                                    fontSize: "0.875rem",
                                    color: "#6b7280",
                                    marginBottom: "0.75rem"
                                }}>
                                    {searchResult.email}
                                </p>
                                <button
                                    onClick={async () => {
                                        try {
                                            await API.sendFriendRequest(searchResult.id);
                                            setFriendRequestMessage("Request sent successfully!");
                                            setSearchResult(null);
                                            setSearchUserId("");
                                        } catch (error) {
                                            console.error("Error submitting the request:", error);
                                            setFriendRequestMessage("Error sending the request.");
                                        }
                                    }}
                                    style={{
                                        backgroundColor: "#990033",
                                        color: "white",
                                        border: "none",
                                        borderRadius: "0.375rem",
                                        padding: "0.5rem 0.75rem",
                                        fontSize: "0.875rem",
                                        fontWeight: "500",
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
                                    Send friend request
                                </button>
                            </div>
                        )}

                        {friendRequestMessage && (
                            <div style={{
                                textAlign: "center",
                                fontSize: "0.875rem",
                                color: friendRequestMessage.includes("successfully") ? "#10b981" : "#ef4444",
                                marginBottom: "1rem"
                            }}>
                                {friendRequestMessage}
                            </div>
                        )}

                        <button
                            onClick={() => {
                                setShowAddFriendModal(false);
                                setSearchResult(null);
                                setSearchUserId("");
                                setFriendRequestMessage("");
                            }}
                            style={{
                                backgroundColor: "#f3f4f6",
                                color: "#374151",
                                border: "1px solid #d1d5db",
                                borderRadius: "0.375rem",
                                padding: "0.625rem 1rem",
                                fontSize: "0.875rem",
                                fontWeight: "500",
                                width: "100%",
                                cursor: "pointer",
                                transition: "background-color 0.2s ease"
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = "#e5e7eb";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = "#f3f4f6";
                            }}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

