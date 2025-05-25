"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import API from "@/lib/api";
import { ArrowLeft, Edit, Check, X, LogOut } from "lucide-react";

/**
 * ProfilePage is a React component that renders the user profile view, including
 * the avatar, personal information, bio, and status. Users can update their profile,
 * change their bio, and logout from this page.
 *
 * @module frontend/page/src/app/profile/page.jsx
 * @returns {JSX.Element} A detailed profile page with editable user information.
 */
export default function ProfilePage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bio, setBio] = useState("");
  const [editingBio, setEditingBio] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);
  const router = useRouter();

  /**
   * Fetches the current user data using the stored user ID and populates
   * the state with profile information such as name, avatar, and bio.
   * Called on component mount.
   *
   * @async
   * @function fetchCurrentUser
   * @returns {Promise<void>}
   */
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const userId = localStorage.getItem("currentUserId");
        if (!userId) {
          setError("User not found. Make sure you are logged in.");
          setLoading(false);
          return;
        }

        const userData = await API.getCurrentUser();
        setCurrentUser(userData);
        setBio(userData.bio || "");
        setFirstName(userData.firstName || "");
        setLastName(userData.lastName || "");
        setLoading(false);
      } catch (err) {
        setError("An error occurred while loading the profile. Please try again later.");
        setLoading(false);
      }
    };

    fetchCurrentUser();
  }, []);

  /**
   * Handles the logout process by calling the backend logout endpoint,
   * removing user data from localStorage, and redirecting to the login page.
   *
   * @async
   * @function handleLogout
   * @returns {Promise<void>}
   */
  const handleLogout = async () => {
    try {
      const email = currentUser?.email;
      if (!email) throw new Error("User email not available");

      const res = await fetch(
          `http://localhost:8080/api/auth/logout?email=${encodeURIComponent(email)}`,
          { method: "POST" }
      );

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Errore logout: ${errText}`);
      }

      localStorage.removeItem("currentUserId");
      localStorage.removeItem("currentUserEmail");
      alert("Logout successfully.");
      router.push("/login");
    } catch (err) {
      alert("Error during logout. Try again.");
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
      await API.updateUserBio(currentUser.id, bio.trim());
      setEditingBio(false);
      // Aggiorniamo lo stato currentUser con la nuova bio
      setCurrentUser({
        ...currentUser,
        bio: bio.trim()
      });
      alert("Bio successfully updated.");
    } catch (err) {
      alert("Error saving bio.");
    }
  };

  /**
   * Converts the selected image file into a Base64 string and saves it to state
   * to be sent to the backend during profile update.
   *
   * @function handleAvatarChange
   * @param {React.ChangeEvent<HTMLInputElement>} e - The file input change event.
   * @returns {void}
   */
  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result.split(",")[1];
        setAvatarFile({ name: file.name, base64 });
      };
      reader.readAsDataURL(file);
    }
  };

  /**
   * Updates the user profile (first name, last name, avatar) by sending data to the backend.
   * If successful, the profile is reloaded.
   *
   * @async
   * @function handleProfileSave
   * @returns {Promise<void>}
   */
  const handleProfileSave = async () => {
    try {
      const base64Avatar = avatarFile?.base64 || currentUser.avatar;

      await API.updateUserProfile(currentUser.id, firstName, lastName, base64Avatar);
      alert("Profile updated successfully.");
      setEditingProfile(false);
      window.location.reload();
    } catch (err) {
      alert("Error updating profile.");
    }
  };

  /**
   * Cancella la modifica della bio e ripristina il valore originale
   */
  const handleBioCancel = () => {
    setBio(currentUser?.bio || "");
    setEditingBio(false);
  };

  if (loading) {
    return (
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          backgroundColor: "#f9fafb"
        }}>
          <div style={{
            fontSize: "1.25rem",
            fontWeight: "600",
            color: "#374151"
          }}>
            Loading...
          </div>
        </div>
    );
  }

  if (error) {
    return (
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          padding: "1rem",
          backgroundColor: "#f9fafb"
        }}>
          <div style={{
            color: "#ef4444",
            marginBottom: "1rem",
            fontSize: "1rem"
          }}>
            {error}
          </div>
          <button
              onClick={() => window.location.reload()}
              style={{
                backgroundColor: "#990033",
                color: "white",
                padding: "0.5rem 1rem",
                borderRadius: "0.375rem",
                border: "none",
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
            Retry
          </button>
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
              Your Profile
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
            {/* Profile header banner */}
            <div style={{
              height: "100px",
              backgroundColor: "#990033",
              position: "relative"
            }}></div>

            {/* Profile info section */}
            <div style={{
              padding: "1.5rem",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              position: "relative",
              marginTop: "-50px"
            }}>
              <img
                  src={currentUser.avatar ? `data:image/png;base64,${currentUser.avatar}` : "https://dummyimage.com/128x128/000/fff&text=U"}
                  alt={currentUser.name}
                  style={{
                    width: "100px",
                    height: "100px",
                    borderRadius: "50%",
                    border: "4px solid white",
                    objectFit: "cover",
                    backgroundColor: "#f3f4f6"
                  }}
              />

              <h2 style={{
                fontSize: "1.5rem",
                fontWeight: "600",
                color: "#1f2937",
                marginTop: "1rem",
                marginBottom: "0.25rem"
              }}>
                {(currentUser.firstName || currentUser.lastName)
                    ? `${currentUser.firstName || ""} ${currentUser.lastName || ""}`.trim()
                    : currentUser.username}
              </h2>

              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                marginBottom: "1rem"
              }}>
                <div style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  backgroundColor: currentUser.status === "online" ? "#10b981" : "#9ca3af"
                }}></div>
                <span style={{
                  fontSize: "0.875rem",
                  color: "#4b5563",
                  textTransform: "capitalize"
                }}>
                {currentUser.status || "offline"}
              </span>
              </div>

              {/* Bio section */}
              <div style={{
                width: "80%",
                marginBottom: "1.5rem"
              }}>
                <div style={{
                  fontSize: "0.875rem",
                  color: "#6b7280",
                  marginBottom: "0.5rem",
                  fontWeight: "500"
                }}>
                  Bio
                </div>

                {!editingBio ? (
                    <div style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      width: "100%",
                      padding: "0.75rem",
                      border: "1px solid #e5e7eb",
                      borderRadius: "0.375rem",
                      backgroundColor: "#f9fafb"
                    }}>
                  <span style={{
                    fontSize: "0.875rem",
                    color: bio.trim() ? "#374151" : "#9ca3af",
                    lineHeight: "1.5",
                    flex: 1
                  }}>
                    {bio.trim() ? bio : "Setup your bio..."}
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
                        <Edit size={16} />
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
                        padding: "0.75rem",
                        fontSize: "0.875rem",
                        border: "1px solid #d1d5db",
                        borderRadius: "0.375rem",
                        resize: "vertical",
                        minHeight: "80px",
                        maxHeight: "200px",
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
                        marginTop: "0.5rem"
                      }}>
                        <div style={{
                          fontSize: "0.75rem",
                          color: bio.length > 180 ? "#e53e3e" : "#6b7280",
                        }}>
                          {bio.length}/200
                        </div>
                        <div style={{
                          display: "flex",
                          gap: "0.5rem",
                        }}>
                          <button
                              onClick={handleBioCancel}
                              style={{
                                backgroundColor: "transparent",
                                border: "1px solid #d1d5db",
                                borderRadius: "0.375rem",
                                padding: "0.5rem 0.75rem",
                                fontSize: "0.875rem",
                                display: "flex",
                                alignItems: "center",
                                gap: "0.25rem",
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
                            <X size={16} />
                            Annulla
                          </button>
                          <button
                              onClick={handleBioSave}
                              style={{
                                backgroundColor: "#990033",
                                border: "none",
                                borderRadius: "0.375rem",
                                padding: "0.5rem 0.75rem",
                                color: "white",
                                fontSize: "0.875rem",
                                display: "flex",
                                alignItems: "center",
                                gap: "0.25rem",
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
                            <Check size={16} />
                            Salva
                          </button>
                        </div>
                      </div>
                    </div>
                )}
              </div>

              {/* Actions section */}
              <div style={{
                display: "flex",
                gap: "1rem",
                marginBottom: "1.5rem"
              }}>
                <button
                    onClick={() => setEditingProfile(true)}
                    style={{
                      backgroundColor: "#990033",
                      color: "white",
                      border: "none",
                      borderRadius: "0.375rem",
                      padding: "0.625rem 1rem",
                      fontSize: "0.875rem",
                      fontWeight: "500",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
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
                  <Edit size={16} />
                  Edit Profile
                </button>

                <button
                    onClick={handleLogout}
                    style={{
                      backgroundColor: "#ef4444",
                      color: "white",
                      border: "none",
                      borderRadius: "0.375rem",
                      padding: "0.625rem 1rem",
                      fontSize: "0.875rem",
                      fontWeight: "500",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      cursor: "pointer",
                      transition: "background-color 0.2s ease"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#dc2626";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "#ef4444";
                    }}
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </div>

              {/* Profile edit form */}
              {editingProfile && (
                  <div style={{
                    width: "100%",
                    padding: "1rem",
                    border: "1px solid #e5e7eb",
                    borderRadius: "0.5rem",
                    backgroundColor: "#f9fafb",
                    marginBottom: "1.5rem"
                  }}>
                    <h3 style={{
                      fontSize: "1rem",
                      fontWeight: "600",
                      color: "#374151",
                      marginBottom: "1rem"
                    }}>
                      Edit Profile
                    </h3>

                    <div style={{
                      marginBottom: "1rem"
                    }}>
                      <label
                          htmlFor="firstName"
                          style={{
                            display: "block",
                            marginBottom: "0.5rem",
                            fontSize: "0.875rem",
                            color: "#4b5563",
                            fontWeight: "500"
                          }}
                      >
                        Name
                      </label>
                      <input
                          id="firstName"
                          type="text"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          placeholder="Name"
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
                          htmlFor="lastName"
                          style={{
                            display: "block",
                            marginBottom: "0.5rem",
                            fontSize: "0.875rem",
                            color: "#4b5563",
                            fontWeight: "500"
                          }}
                      >
                        Last Name
                      </label>
                      <input
                          id="lastName"
                          type="text"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          placeholder="Last Name"
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
                      marginBottom: "1.5rem"
                    }}>
                      <label
                          htmlFor="avatar"
                          style={{
                            display: "block",
                            marginBottom: "0.5rem",
                            fontSize: "0.875rem",
                            color: "#4b5563",
                            fontWeight: "500"
                          }}
                      >
                        Avatar
                      </label>
                      <input
                          id="avatar"
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarChange}
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

                    <div style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      gap: "0.5rem"
                    }}>
                      <button
                          onClick={() => setEditingProfile(false)}
                          style={{
                            backgroundColor: "transparent",
                            border: "1px solid #d1d5db",
                            borderRadius: "0.375rem",
                            padding: "0.5rem 0.75rem",
                            fontSize: "0.875rem",
                            color: "#374151",
                            cursor: "pointer",
                            transition: "background-color 0.2s ease"
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "#f3f4f6";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "transparent";
                          }}
                      >
                        Undo
                      </button>
                      <button
                          onClick={handleProfileSave}
                          style={{
                            backgroundColor: "#990033",
                            color: "white",
                            border: "none",
                            borderRadius: "0.375rem",
                            padding: "0.5rem 0.75rem",
                            fontSize: "0.875rem",
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
                        Save
                      </button>
                    </div>
                  </div>
              )}

              {/* User info details */}
              <div style={{
                width: "100%"
              }}>
                <h3 style={{
                  fontSize: "1rem",
                  fontWeight: "600",
                  color: "#374151",
                  marginBottom: "1rem",
                  paddingBottom: "0.5rem",
                  borderBottom: "1px solid #e5e7eb"
                }}>
                  User Information
                </h3>

                <div style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 2fr",
                  gap: "0.5rem",
                  marginBottom: "0.75rem"
                }}>
                  <div style={{ fontWeight: "500", color: "#6b7280", fontSize: "0.875rem" }}>User ID:</div>
                  <div style={{ color: "#1f2937", fontSize: "0.875rem" }}>{currentUser.id}</div>
                </div>

                <div style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 2fr",
                  gap: "0.5rem",
                  marginBottom: "0.75rem"
                }}>
                  <div style={{ fontWeight: "500", color: "#6b7280", fontSize: "0.875rem" }}>Email:</div>
                  <div style={{ color: "#1f2937", fontSize: "0.875rem" }}>{currentUser.email}</div>
                </div>

                <div style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 2fr",
                  gap: "0.5rem",
                  marginBottom: "0.75rem"
                }}>
                  <div style={{ fontWeight: "500", color: "#6b7280", fontSize: "0.875rem" }}>State:</div>
                  <div style={{ color: "#1f2937", fontSize: "0.875rem", textTransform: "capitalize" }}>{currentUser.status || "offline"}</div>
                </div>

                <div style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 2fr",
                  gap: "0.5rem",
                  marginBottom: "0.75rem"
                }}>
                  <div style={{ fontWeight: "500", color: "#6b7280", fontSize: "0.875rem" }}>Avatar:</div>
                  <div style={{ color: "#1f2937", fontSize: "0.875rem" }}>{currentUser.avatar ? "Custom" : "Default"}</div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
  );
}