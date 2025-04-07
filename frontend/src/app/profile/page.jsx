// src/app/profile/page.jsx

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import API from "@/lib/api";

/**
 * ProfilePage - User profile view ("/profile").
 * @module frontend/page/src/app/profile/page.jsx
 * @description Displays the logged-in user's profile information and allows logout.
 */
export default function ProfilePage() {
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
   * Fetches the current user data on component mount.
   * @async
   * @returns {Promise<void>}
   */
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const userData = await API.getCurrentUser();
        setCurrentUser(userData);
        setLoading(false);
      } catch (err) {
        console.error("Errore nel caricamento del profilo:", err);
        setError("Si è verificato un errore nel caricamento del profilo. Riprova più tardi.");
        setLoading(false);
      }
    };

    fetchCurrentUser();
  }, []);

  /**
   * Handles the logout process for the current user.
   * Sends a request to the backend and clears localStorage.
   * @async
   * @function handleLogout
   * @returns {Promise<void>}
   */
  const handleLogout = async () => {
    try {
      const email = currentUser?.email;
      if (!email) throw new Error("Email utente non disponibile");

      const res = await fetch(`http://localhost:8080/api/auth/logout?email=${email}`, {
        method: "POST",
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Errore logout: ${errText}`);
      }

      localStorage.removeItem("currentUserId");
      localStorage.removeItem("currentUserEmail");
      alert("Logout effettuato con successo.");
      router.push("/login");
    } catch (err) {
      console.error("Errore durante il logout:", err);
      alert("Errore durante il logout. Riprova.");
    }
  };

  // Loading state
  if (loading) {
    return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-xl font-semibold">Caricamento...</div>
        </div>
    );
  }

  // Error state
  if (error) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
          <div className="text-red-500 mb-4">{error}</div>
          <button onClick={() => window.location.reload()} className="btn btn-primary">
            Riprova
          </button>
        </div>
    );
  }

  // Null user fallback
  if (!currentUser) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
          <div className="text-red-500 mb-4">Profilo non trovato</div>
          <button onClick={() => router.push("/")} className="btn btn-primary">
            Torna alla lista chat
          </button>
        </div>
    );
  }

  return (
      <div className="page-container">
        {/* Header */}
        <header className="page-header">
          <div className="container mx-auto flex items-center">
            <button onClick={() => router.push("/")} className="btn btn-icon">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-xl font-bold ml-3">Il tuo profilo</h1>
          </div>
        </header>

        {/* Main content */}
        <main className="page-content">
          <div className="card overflow-hidden">
            {/* Copertina profilo */}
            <div className="profile-header"></div>

            {/* Informazioni utente */}
            <div className="profile-avatar-container">
              <img
                  src={currentUser.avatar || "https://dummyimage.com/128x128/000/fff&text=P"}
                  alt={currentUser.name}
                  className="profile-avatar"
              />

              <h2 className="profile-name">{currentUser.name}</h2>

              <div className="user-status mt-2">
                <span className={`status-indicator ${currentUser.status === "online" ? "status-online" : "status-offline"}`}></span>
                <span className="capitalize">{currentUser.status}</span>
              </div>

              {/* Azioni */}
              <div className="profile-actions">
                <button onClick={() => alert("Funzionalità di modifica profilo non ancora implementata")} className="btn btn-primary flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  Modifica Profilo
                </button>

                <button onClick={() => alert("Funzionalità di cambio stato non ancora implementata")} className="btn btn-secondary flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                  Cambia Stato
                </button>

                <button onClick={handleLogout} className="btn bg-red-600 text-white mt-4 hover:bg-red-700">
                  Logout
                </button>
              </div>
            </div>

            {/* Altri dettagli */}
            <div className="border-t mt-6">
              <dl className="divide-y">
                <div className="px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4">
                  <dt className="text-sm font-medium text-gray-500">ID Utente</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{currentUser.id}</dd>
                </div>
                <div className="px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4">
                  <dt className="text-sm font-medium text-gray-500">Stato</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2 capitalize">{currentUser.status}</dd>
                </div>
                <div className="px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4">
                  <dt className="text-sm font-medium text-gray-500">Avatar URL</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2 truncate">{currentUser.avatar}</dd>
                </div>
              </dl>
            </div>
          </div>
        </main>
      </div>
  );
}
