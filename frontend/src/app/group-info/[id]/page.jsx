"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import API from "@/lib/api";
import "./styles.css";

/**
 * Handles the display and management of a group chat's information page.
 * It allows updating group details, adding/removing participants, and modifying user roles within the group.
 * The component includes functionality for editing group title, description, and avatar,
 * as well as managing users and their roles in the group.
 *
 * @module frontend/page/src/app/group-info/id/page.jsx
 * @returns {JSX.Element} The GroupInfoPage component.
 */
export default function GroupInfoPage() {
    const {id} = useParams();
    const router = useRouter();

    const [chat, setChat] = useState(null);
    const [addedUsers, setAddedUsers] = useState([]);
    const [usersMap, setUsersMap] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [showEditForm, setShowEditForm] = useState(false);

    const [newTitle, setNewTitle] = useState("");
    const [newDescription, setNewDescription] = useState("");
    const [newAvatar, setNewAvatar] = useState(null);

    const [showAddFriendPopup, setShowAddFriendPopup] = useState(false);
    const [friendsList, setFriendsList] = useState([]);

    const editFormRef = useRef(null);

    const getAvatarSrc = (avatar, fallback = "U") => {
        return avatar ? `data:image/png;base64,${avatar}` : `https://dummyimage.com/40x40/000/fff&text=${fallback}`;
    };

    const canRemove = (targetId) => {
        if (targetId === currentUserId) return true;

        const isTargetCreator = targetId === creatorId;
        const isTargetAdmin = Object.values(adminMap).includes(targetId);

        if (currentUserId === creatorId) return !isTargetCreator;
        if (Object.values(adminMap).includes(currentUserId)) {
            return !isTargetCreator && !isTargetAdmin; //admin can only remove members
        }
        return false;
    };


    useEffect(() => {
        const fetchGroupInfo = async () => {
            try {
                const userId = localStorage.getItem("currentUserId");
                setCurrentUserId(userId);

                const chatData = await API.getChatById(id);
                if (!chatData || chatData.chat?.type !== "group") {
                    setError("This is not a group chat");
                    setLoading(false);
                    return;
                }

                setChat(chatData.chat);
                setNewTitle(chatData.chat.title || "");
                setNewDescription(chatData.chat.description || "");

                const participantIds = chatData.chat.participants || [];
                const users = await Promise.all(participantIds.map(uid => API.getUserById(uid)));
                const userMap = {};
                users.forEach(user => {
                    if (user?.id) userMap[user.id] = user;
                });

                setUsersMap(userMap);
                setLoading(false);
            } catch (err) {
                console.error("Error loading the group:", err);
                setError("Error loading the group:");
                setLoading(false);
            }
        };

        fetchGroupInfo();
    }, [id]);

    useEffect(() => {
        if (!currentUserId || !chat || !showAddFriendPopup) return;

        const fetchFriends = async () => {
            try {
                const currentUser = await API.getUserById(currentUserId);
                const friendIds = Object.keys(currentUser?.user?.friends || {});
                const friendData = await Promise.all(friendIds.map(id => API.getUserById(id)));
                setFriendsList(friendData.filter(u => u && !chat.participants.includes(u.id)));
            } catch (err) {
                console.error("Error loading the friends:", err);
            }
        };

        fetchFriends();
    }, [showAddFriendPopup, currentUserId, chat]);

    /**
     * Handles the change of the group's avatar.
     * This function reads a selected image file and converts it into a base64 encoded string.
     *
     * @function handleAvatarChange
     * @param {Event} e - The event triggered by the file input change.
     * @returns {void} This function does not return anything.
     */
    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = reader.result.split(",")[1];
            setNewAvatar(base64);
        };
        reader.readAsDataURL(file);
    };

    /**
     * Adds a friend to the group chat.
     * Sends a request to the backend to add the selected user to the group.
     *
     * @function handleAddFriendToGroup
     * @param {string} friendId - The ID of the friend to add to the group.
     * @returns {Promise<void>} This function returns a promise and does not return anything on success.
     */
    const handleAddFriendToGroup = async (friendId) => {
        try {
            await API.addUserToGroup(id, friendId, currentUserId);
            setAddedUsers(prev => [...prev, friendId]);
        } catch (err) {
            console.error("Error adding user:", err);
            alert("Error adding to the group.");
        }
    };

    /**
     * Deletes the group chat.
     * Asks for user confirmation before deleting the group, and if confirmed, sends a delete request to the backend.
     * Redirects to the homepage upon successful deletion.
     *
     * @function handleDeleteGroup
     * @returns {Promise<void>} This function does not return anything.
     */
    const handleDeleteGroup = async () => {
        const conferma = window.confirm("Sei sicuro di voler eliminare l'intero gruppo? Questa azione è irreversibile.");
        if (!conferma) return;

        try {
            await API.deleteGroup(id, currentUserId);
            alert("Group deleted.");
            router.push("/");
        } catch (err) {
            console.error("Group Delete Error:", err);
            alert("Error deleting the group.");
        }
    };

    /**
     * Removes a participant from the group chat.
     * Sends a request to the backend to remove the specified user from the group.
     * If the current user is the one being removed, it will leave the group.
     *
     * @function handleRemoveParticipant
     * @param {string} targetUserId - The ID of the user to be removed from the group.
     * @returns {Promise<void>} This function does not return anything.
     */
    const handleRemoveParticipant = async (targetUserId) => {
        let confermaMsg = "";

        if (targetUserId === currentUserId) {
            confermaMsg = currentUserId === chat.creator
                ? "You are the creator of the group. On leaving, the group will be deleted for everyone. Are you sure?"
                : "Are you sure you want to get out of the group?";
        } else {
            confermaMsg = "Are you sure you want to remove this participant?";
        }

        const conferma = window.confirm(confermaMsg);
        if (!conferma) return;

        try {
            await API.removeUserFromGroup(id, targetUserId, currentUserId);

            if (targetUserId === currentUserId) {
                if (currentUserId === chat.creator) {
                    alert("You deleted the group by leaving.");
                } else {
                    alert("You left the group.");
                }
                router.push("/");
            } else {
                alert("Participant removed.");
                window.location.reload();
            }
        } catch (err) {
            console.error("Error in removal:", err);
            alert("Error removing the participant.");
        }
    };


    /**
     * Changes the role of a participant in the group.
     * Promotes or demotes a user to either 'admin' or 'member' status.
     *
     * @function handleRoleChange
     * @param {string} targetUserId - The ID of the user whose role will be updated.
     * @param {boolean} promote - A flag indicating whether the user should be promoted to 'admin' (true) or demoted to 'member' (false).
     * @returns {Promise<void>} This function does not return anything.
     */
    const handleRoleChange = async (targetUserId, promote) => {
        try {
            await API.updateGroupRole(id, {
                requesterId: currentUserId,
                targetUserId: targetUserId,
                newRole: promote ? "admin" : "member"  // Corrected case consistency
            });
            alert("Updated role");
            window.location.reload();
        } catch (err) {
            console.error("Role update error:", err);
            alert("Error updating role");
        }
    };

    /**
     * Updates the group's information, including its title, description, and avatar.
     * Sends a request to the backend to update the group data and reloads the page upon success.
     *
     * @function handleUpdateGroup
     * @returns {Promise<void>} This function does not return anything.
     */
    const handleUpdateGroup = async () => {
        try {
            await API.updateGroupInfo(id, {
                title: newTitle,
                description: newDescription,
                avatar: newAvatar,
                requesterId: currentUserId
            });
            alert("Group updated successfully.");
            window.location.reload();
        } catch (err) {
            console.error("Group update error:", err);
            alert("Error updating the group.");
        }
    };

    /**
     * Scrolls to the edit form to allow the user to modify group information.
     * This function sets the form to be visible and ensures it is scrolled into view.
     *
     * @function scrollToEditForm
     * @returns {void} This function does not return anything.
     */
    const scrollToEditForm = () => {
        setShowEditForm(true); // mostra il form
        setTimeout(() => {
            if (editFormRef.current) {
                editFormRef.current.scrollIntoView({behavior: "smooth"});
            }
        }, 100); // attende il rendering
    };

    if (loading) return <div className="group-info-container">Loading...</div>;
    if (error) return <div className="group-info-container">{error}</div>;
    if (!chat) return <div className="group-info-container">Group not found.</div>;
    getAvatarSrc(chat.avatar, "G");
    const groupTitle = chat.title || "Without Title";
    const creatorId = chat.creator;
    const adminMap = chat.admin || {};

    const getRoleLabel = (uid) => {
        if (uid === creatorId) return "Creator";
        if (Object.values(adminMap).includes(uid)) return "Admin";
        return "Member";
    };

    const isAdmin = currentUserId === creatorId || Object.values(adminMap).includes(currentUserId);
    console.log("are?", isAdmin);

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
                        onClick={() => router.back()}
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
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M19 12H5M12 19l-7-7 7-7"/>
                        </svg>
                    </button>
                    <h1 style={{
                        fontSize: "1.5rem",
                        fontWeight: "bold"
                    }}>
                        Group Information
                    </h1>
                </div>

                <img
                    src="https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/Milano-Bicocca_University_logo_2.svg/2095px-Milano-Bicocca_University_logo_2.svg.png"
                    width="60"
                    alt="logo"
                    style={{borderRadius: "4px"}}
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
                    {/* Group header banner */}
                    <div style={{
                        height: "50px",
                        backgroundColor: "#990033",
                        position: "relative"
                    }}></div>

                    {/* Group info section */}
                    <div style={{
                        padding: "1.5rem",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        position: "relative",
                        marginTop: "-60px"
                    }}>
                        <img
                            src={getAvatarSrc(chat.avatar, "G")}
                            alt={groupTitle}
                            style={{
                                width: "100px",
                                height: "100px",
                                borderRadius: "50%",
                                border: "4px solid white",
                                objectFit: "cover",
                                backgroundColor: "#f3f4f6"
                            }}
                        />

                        <div style={{
                            display: "flex",
                            alignItems: "center",
                            marginTop: "0.5rem",
                            marginBottom: "0.25rem",
                            gap: "0.5rem"
                        }}>
                            <h2 style={{
                                fontSize: "1.5rem",
                                fontWeight: "600",
                                color: "#1f2937"
                            }}>
                                {groupTitle}
                            </h2>
                            {isAdmin && (
                                <button
                                    onClick={scrollToEditForm}
                                    title="Modify group"
                                    style={{
                                        background: "none",
                                        border: "none",
                                        padding: "4px",
                                        display: "flex",
                                        cursor: "pointer",
                                        color: "#4b5563"
                                    }}
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="20"
                                        height="20"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <path
                                            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                                    </svg>
                                </button>
                            )}
                        </div>

                        {/* Group description */}
                        <div style={{
                            width: "80%",
                            marginTop: "1.5rem"
                        }}>
                            <h3 style={{
                                fontSize: "1rem",
                                fontWeight: "600",
                                color: "#374151",
                                marginBottom: "1rem",
                                paddingBottom: "0.5rem",
                                borderBottom: "1px solid #e5e7eb"
                            }}>
                                Group Description
                            </h3>

                            <p style={{
                                color: "#1f2937",
                                fontSize: "0.875rem",
                                marginBottom: "1.5rem"
                            }}>
                                {chat.description || "This is a group BicoChat. Here you will be able to see the participants, the roles, and the important messages."}
                            </p>

                            {/* Edit form when active */}
                            {isAdmin && showEditForm && (
                                <div style={{
                                    padding: "1rem",
                                    marginBottom: "1.5rem",
                                    border: "1px solid #e5e7eb",
                                    borderRadius: "0.375rem",
                                    backgroundColor: "#f9fafb"
                                }}
                                     ref={editFormRef}
                                >
                                    <div style={{
                                        marginBottom: "0.75rem"
                                    }}>
                                        <label style={{
                                            fontWeight: "500",
                                            color: "#6b7280",
                                            fontSize: "0.875rem",
                                            display: "block",
                                            marginBottom: "0.25rem"
                                        }}>
                                            Title:
                                        </label>
                                        <input
                                            value={newTitle}
                                            onChange={(e) => setNewTitle(e.target.value)}
                                            style={{
                                                width: "100%",
                                                padding: "0.5rem",
                                                borderRadius: "0.375rem",
                                                border: "1px solid #d1d5db",
                                                fontSize: "0.875rem"
                                            }}
                                        />
                                    </div>

                                    <div style={{
                                        marginBottom: "0.75rem"
                                    }}>
                                        <label style={{
                                            fontWeight: "500",
                                            color: "#6b7280",
                                            fontSize: "0.875rem",
                                            display: "block",
                                            marginBottom: "0.25rem"
                                        }}>
                                            Description:
                                        </label>
                                        <textarea
                                            value={newDescription}
                                            onChange={(e) => setNewDescription(e.target.value)}
                                            style={{
                                                width: "100%",
                                                padding: "0.5rem",
                                                borderRadius: "0.375rem",
                                                border: "1px solid #d1d5db",
                                                fontSize: "0.875rem",
                                                minHeight: "80px",
                                                resize: "vertical"
                                            }}
                                        />
                                    </div>

                                    <div style={{
                                        marginBottom: "1rem"
                                    }}>
                                        <label style={{
                                            fontWeight: "500",
                                            color: "#6b7280",
                                            fontSize: "0.875rem",
                                            display: "block",
                                            marginBottom: "0.25rem"
                                        }}>
                                            Group Image:
                                        </label>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleAvatarChange}
                                            style={{
                                                fontSize: "0.875rem",
                                                width: "100%"
                                            }}
                                        />
                                    </div>

                                    <div style={{
                                        display: "flex",
                                        gap: "0.5rem",
                                        justifyContent: "flex-end"
                                    }}>
                                        <button
                                            onClick={() => setShowEditForm(false)}
                                            style={{
                                                backgroundColor: "#e5e7eb",
                                                color: "#4b5563",
                                                padding: "0.5rem 1rem",
                                                borderRadius: "0.375rem",
                                                border: "none",
                                                fontWeight: "500",
                                                fontSize: "0.875rem",
                                                cursor: "pointer"
                                            }}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleUpdateGroup}
                                            style={{
                                                backgroundColor: "#990033",
                                                color: "white",
                                                padding: "0.5rem 1rem",
                                                borderRadius: "0.375rem",
                                                border: "none",
                                                fontWeight: "500",
                                                fontSize: "0.875rem",
                                                cursor: "pointer"
                                            }}
                                        >
                                            Save Changes
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Participants section */}
                            <div style={{
                                marginTop: "1.5rem",
                                marginBottom: "1rem"
                            }}>
                                <div style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    marginBottom: "1rem",
                                    paddingBottom: "0.5rem",
                                    borderBottom: "1px solid #e5e7eb"
                                }}>
                                    <h3 style={{
                                        fontSize: "1rem",
                                        fontWeight: "600",
                                        color: "#374151"
                                    }}>
                                        Participants
                                    </h3>

                                    {isAdmin && (
                                        <button
                                            title="Add participants"
                                            onClick={() => setShowAddFriendPopup(true)}
                                            style={{
                                                backgroundColor: "#990033",
                                                color: "white",
                                                border: "none",
                                                borderRadius: "50%",
                                                width: "28px",
                                                height: "28px",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                cursor: "pointer"
                                            }}
                                        >
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                width="16"
                                                height="16"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            >
                                                <path d="M12 5v14M5 12h14"/>
                                            </svg>
                                        </button>
                                    )}
                                </div>

                                {/* Participants list */}
                                <div style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "0.75rem"
                                }}>
                                    {chat.participants?.map(uid => {
                                        const user = usersMap[uid];
                                        return (
                                            <div key={uid} style={{
                                                display: "flex",
                                                alignItems: "center",
                                                padding: "0.5rem",
                                                borderRadius: "0.375rem",
                                                backgroundColor: "#f9fafb"
                                            }}>
                                                <img
                                                    src={getAvatarSrc(user?.user.avatar)}
                                                    alt={user?.user.username || "User"}
                                                    style={{
                                                        width: "40px",
                                                        height: "40px",
                                                        borderRadius: "50%",
                                                        objectFit: "cover"
                                                    }}
                                                />

                                                <div style={{
                                                    marginLeft: "0.75rem",
                                                    flex: 1
                                                }}>
                                                    <div style={{
                                                        fontSize: "0.875rem",
                                                        fontWeight: "500",
                                                        color: "#1f2937"
                                                    }}>
                                                        {user?.user.username || user?.user.name || "User"}
                                                    </div>

                                                    <div style={{
                                                        display: "inline-block",
                                                        fontSize: "0.75rem",
                                                        padding: "0.125rem 0.5rem",
                                                        borderRadius: "0.25rem",
                                                        backgroundColor:
                                                            getRoleLabel(uid) === "Creator"
                                                                ? "#990033"
                                                                : getRoleLabel(uid) === "Admin"
                                                                    ? "#490c17"
                                                                    : "#e5e7eb",
                                                        color:
                                                            getRoleLabel(uid) === "Member"
                                                                ? "#4b5563"
                                                                : "white",
                                                        marginTop: "0.25rem"
                                                    }}>
                                                        {getRoleLabel(uid)}
                                                    </div>
                                                </div>

                                                {/* Role and remove buttons */}
                                                <div style={{
                                                    display: "flex",
                                                    gap: "0.5rem"
                                                }}>
                                                    {isAdmin && uid !== currentUserId && currentUserId === creatorId && (
                                                        <button
                                                            onClick={() => handleRoleChange(uid, getRoleLabel(uid) === "Member")}
                                                            style={{
                                                                fontSize: "0.75rem",
                                                                padding: "0.25rem 0.5rem",
                                                                borderRadius: "0.25rem",
                                                                border: "1px solid #d1d5db",
                                                                backgroundColor: "#f3f4f6",
                                                                color: "#4b5563",
                                                                cursor: "pointer",
                                                                whiteSpace: "nowrap"
                                                            }}
                                                        >
                                                            {getRoleLabel(uid) === "Member" ? "Make Admin" : "Remove Admin"}
                                                        </button>
                                                    )}

                                                    {canRemove(uid) && (
                                                        <button
                                                            onClick={() => handleRemoveParticipant(uid)}
                                                            style={{
                                                                fontSize: "0.75rem",
                                                                padding: "0.25rem 0.5rem",
                                                                borderRadius: "0.25rem",
                                                                border: "1px solid #990033",
                                                                backgroundColor: "white",
                                                                color: "#990033",
                                                                cursor: "pointer",
                                                                whiteSpace: "nowrap"
                                                            }}
                                                        >
                                                            {uid === currentUserId ? "Leave Group" : "Remove"}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Delete group button (for creator only) */}
                            {currentUserId === creatorId && (
                                <div style={{
                                    display: "flex",
                                    justifyContent: "center",
                                    marginTop: "1.5rem"
                                }}>
                                    <button
                                        onClick={handleDeleteGroup}
                                        style={{
                                            backgroundColor: "#990033",
                                            color: "white",
                                            padding: "0.625rem 1rem",
                                            fontSize: "0.875rem",
                                            fontWeight: "500",
                                            borderRadius: "0.375rem",
                                            border: "none",
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
                                        Delete Group
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            {/* Add Friend Popup */}
            {showAddFriendPopup && (
                <div style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: "rgba(0, 0, 0, 0.5)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 1000
                }}>
                    <div style={{
                        backgroundColor: "white",
                        borderRadius: "0.5rem",
                        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                        width: "90%",
                        maxWidth: "500px",
                        maxHeight: "80vh",
                        overflow: "hidden",
                        position: "relative"
                    }}>
                        <div style={{
                            padding: "1rem",
                            borderBottom: "1px solid #e5e7eb",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center"
                        }}>
                            <h3 style={{
                                fontSize: "1.125rem",
                                fontWeight: "600",
                                color: "#1f2937"
                            }}>
                                Add Participants
                            </h3>
                            <button
                                onClick={() => {
                                    setShowAddFriendPopup(false);
                                    setTimeout(() => window.location.reload(), 200);
                                }}
                                style={{
                                    background: "none",
                                    border: "none",
                                    fontSize: "1.5rem",
                                    color: "#6b7280",
                                    cursor: "pointer"
                                }}
                            >
                                ×
                            </button>
                        </div>

                        <div style={{
                            padding: "1rem",
                            maxHeight: "60vh",
                            overflowY: "auto"
                        }}>
                            {friendsList.length === 0 && (
                                <p style={{
                                    textAlign: "center",
                                    color: "#6b7280",
                                    padding: "1rem"
                                }}>
                                    No friends available to add
                                </p>
                            )}

                            <div style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "0.75rem"
                            }}>
                                {friendsList.map(friend => {
                                    const isAdded = addedUsers.includes(friend.id);
                                    return (
                                        <div key={friend.id} style={{
                                            display: "flex",
                                            alignItems: "center",
                                            padding: "0.5rem",
                                            borderRadius: "0.375rem",
                                            backgroundColor: "#f9fafb"
                                        }}>
                                            <img
                                                src={getAvatarSrc(friend.user.avatar, "F")}
                                                alt={friend.user.username}
                                                style={{
                                                    width: "40px",
                                                    height: "40px",
                                                    borderRadius: "50%",
                                                    objectFit: "cover"
                                                }}
                                            />

                                            <div style={{
                                                marginLeft: "0.75rem",
                                                flex: 1,
                                                fontSize: "0.875rem",
                                                fontWeight: "500",
                                                color: "#1f2937"
                                            }}>
                                                {friend.user.username}
                                            </div>

                                            {isAdded ? (
                                                <div style={{
                                                    color: "#10b981",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "0.25rem",
                                                    fontSize: "0.875rem",
                                                    fontWeight: "500"
                                                }}>
                                                    <svg
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        width="16"
                                                        height="16"
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeWidth="2"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                    >
                                                        <path d="M20 6L9 17l-5-5"/>
                                                    </svg>
                                                    Added
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => handleAddFriendToGroup(friend.id)}
                                                    style={{
                                                        backgroundColor: "#990033",
                                                        color: "white",
                                                        padding: "0.375rem 0.75rem",
                                                        fontSize: "0.75rem",
                                                        fontWeight: "500",
                                                        borderRadius: "0.25rem",
                                                        border: "none",
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
                                                    Add
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}