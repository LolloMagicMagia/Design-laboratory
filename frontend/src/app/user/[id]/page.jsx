// src/app/user/[id]/page.jsx

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import API from "@/lib/DataService";

export default function UserProfilePage({ params }) {
  const userId = params.id;
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userData = await API.getUserById(userId);
        setUser(userData);
        setLoading(false);
      } catch (err) {
        console.error("Errore nel caricamento dell'utente:", err);
        setError("Si è verificato un errore nel caricamento dell'utente. Riprova più tardi.");
        setLoading(false);
      }
    };

    fetchUser();
  }, [userId]);

  const handleStartChat = async () => {
    try {
      // Verifica se esiste già una chat individuale con questo utente
      const chats = await API.getChats();
      const existingChat = chats.find(chat => 
        chat.type === "individual" && 
        chat.participants.includes(userId) && 
        chat.participants.includes("currentUser")
      );
      
      if (existingChat) {
        // Naviga alla chat esistente
        router.push(`/chat/${existingChat.id}`);
      } else {
        // Crea una nuova chat
        const newChat = await API.createChat({
          name: user.name,
          type: "individual",
          participants: ["currentUser", userId]
        });
        
        // Naviga alla nuova chat
        router.push(`/chat/${newChat.id}`);
      }
    } catch (err) {
      console.error("Errore nell'avvio della chat:", err);
      setError("Si è verificato un errore nell'avvio della chat. Riprova più tardi.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl font-semibold">Caricamento...</div>
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
          Riprova
        </button>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="text-red-500 mb-4">Utente non trovato</div>
        <button 
          onClick={() => router.push("/")} 
          className="btn btn-primary"
        >
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
          <button 
            onClick={() => router.back()} 
            className="btn btn-icon"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold ml-3">Profilo Utente</h1>
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
              src={user.avatar || "https://dummyimage.com/128x128/000/fff&text=P"}
              alt={user.name} 
              className="profile-avatar"
            />
            
            <h2 className="profile-name">{user.name}</h2>
            
            <div className="user-status mt-2">
              <span className={`status-indicator ${
                user.status === "online" ? "status-online" : "status-offline"
              }`}></span>
              <span className="capitalize">{user.status}</span>
            </div>
            
            {/* Azioni */}
            <div className="profile-actions">
              <button 
                onClick={handleStartChat}
                className="btn btn-primary flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Invia Messaggio
              </button>
              
              <button 
                className="btn btn-secondary flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                Aggiungi Contatto
              </button>
            </div>
          </div>
          
          {/* Altri dettagli */}
          <div className="border-t mt-6">
            <dl className="divide-y">
              <div className="px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4">
                <dt className="text-sm font-medium text-gray-500">ID Utente</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{user.id}</dd>
              </div>
              <div className="px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4">
                <dt className="text-sm font-medium text-gray-500">Stato</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2 capitalize">{user.status}</dd>
              </div>
              <div className="px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4">
                <dt className="text-sm font-medium text-gray-500">Avatar URL</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2 truncate">{user.avatar}</dd>
              </div>
            </dl>
          </div>
        </div>
      </main>
    </div>
  );
}