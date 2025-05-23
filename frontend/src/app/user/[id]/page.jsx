// src/app/user/[id]/page.jsx

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import API from "@/lib/api";
import { ArrowLeft } from "lucide-react";

/**
 * UserProfilePage è un componente React client-side che visualizza il profilo
 * di un utente specifico, recuperato tramite ID dalla URL dinamica. Mostra
 * informazioni come nome, stato, bio e consente l'invio di una richiesta
 * di amicizia se non già amici.
 *
 * @module src/app/user/id/page.jsx
 * @returns {JSX.Element} Interfaccia utente del profilo con informazioni dettagliate e interazioni.
 */
export default function UserProfilePage() {
  const { id: userId } = useParams();
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFriend, setIsFriend] = useState(false);
  const [requestSent, setRequestSent] = useState(false);

  /**
   * useEffect per effettuare il fetch dei dati dell'utente e controllare
   * lo stato di amicizia.
   */
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userData = await API.getUserById(userId);
        setUser(userData);

        const currentId = localStorage.getItem("currentUserId");
        if (!currentId || currentId === userId) {
          setIsFriend(true);
          return;
        }

        const friends = await API.getFriendsList();
        const isAlreadyFriend = friends.some(f => f.id === userId && f.friendshipStatus === "active");
        setIsFriend(isAlreadyFriend);
      } catch (err) {
        console.error("User loading error:", err);
        setError("Error loading the user.");
      } finally {
        setLoading(false);
      }
    };
    if (userId) fetchUser();
  }, [userId]);

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

  if (error || !user) {
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
            {error || "User not found"}
          </div>
          <button
              onClick={() => router.push("/")}
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
            Back to home
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
              <ArrowLeft size={24} />
            </button>
            <h1 style={{
              fontSize: "1.5rem",
              fontWeight: "bold"
            }}>
              User Information
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
                  src={user.user.avatar ? `data:image/png;base64,${user.user.avatar}` : "https://dummyimage.com/128x128/000/fff&text=P"}
                  alt={user.user.username}
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
                {user.user.username}
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
                  backgroundColor: user.user.status === "online" ? "#10b981" : "#9ca3af"
                }}></div>
                <span style={{
                  fontSize: "0.875rem",
                  color: "#4b5563",
                  textTransform: "capitalize"
                }}>
                {user.user.status || "offline"}
              </span>
              </div>

              {/* User info details */}
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
                  User Information
                </h3>

                <div style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 2fr",
                  gap: "0.5rem",
                  marginBottom: "0.75rem"
                }}>
                  <div style={{ fontWeight: "500", color: "#6b7280", fontSize: "0.875rem" }}>User ID:</div>
                  <div style={{
                    color: "#1f2937",
                    fontSize: "0.875rem",
                    maxWidth: "100%",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap"
                  }}>{user.id}</div>
                </div>

                <div style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 2fr",
                  gap: "0.5rem",
                  marginBottom: "0.75rem"
                }}>
                  <div style={{ fontWeight: "500", color: "#6b7280", fontSize: "0.875rem" }}>Name:</div>
                  <div style={{ color: "#1f2937", fontSize: "0.875rem" }}>{user.user.username}</div>
                </div>

                <div style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 2fr",
                  gap: "0.5rem",
                  marginBottom: "0.75rem"
                }}>
                  <div style={{ fontWeight: "500", color: "#6b7280", fontSize: "0.875rem" }}>Status:</div>
                  <div style={{ color: "#1f2937", fontSize: "0.875rem", textTransform: "capitalize" }}>{user.user.status || "N/A"}</div>
                </div>

                <div style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 2fr",
                  gap: "0.5rem",
                  marginBottom: "1.5rem"
                }}>
                  <div style={{ fontWeight: "500", color: "#6b7280", fontSize: "0.875rem" }}>Bio:</div>
                  <div style={{ color: "#1f2937", fontSize: "0.875rem" }}>{user.user.bio || "No bio available."}</div>
                </div>

                {/* Friend request section */}
                {!isFriend && !requestSent && (
                    <div style={{
                      display: "flex",
                      justifyContent: "center",
                      marginTop: "1rem",
                      marginBottom: "1rem"
                    }}>
                      <button
                          onClick={async () => {
                            try {
                              await API.sendFriendRequest(userId);
                              setRequestSent(true);
                            } catch (err) {
                              console.error("Error in sending request:", err);
                            }
                          }}
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
                        Send friend request
                      </button>
                    </div>
                )}

                {requestSent && (
                    <div style={{
                      display: "flex",
                      justifyContent: "center",
                      marginTop: "1rem",
                      marginBottom: "1rem"
                    }}>
                      <p style={{
                        color: "#10b981",
                        border: "1px solid #d1fae5",
                        backgroundColor: "#ecfdf5",
                        padding: "0.625rem 1rem",
                        borderRadius: "0.375rem",
                        fontSize: "0.875rem",
                        fontWeight: "500"
                      }}>
                        Request sent!
                      </p>
                    </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
  );
}