"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import API from "@/lib/api";

export default function NewChatPage() {
  const [friends, setFriends] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [chatName, setChatName] = useState("");
  const [chatType, setChatType] = useState("individual");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);
  const [initialMessage, setInitialMessage] = useState(""); // Nuovo stato per il messaggio iniziale
  const router = useRouter();

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

  // Filtra gli amici attivi
  const activeFriends = friends.filter(friend => friend.friendshipStatus === "active");
  // Filtra le richieste in attesa
  const pendingFriends = friends.filter(friend => friend.friendshipStatus === "pending");

  // Aggiorna automaticamente il nome della chat per le chat individuali
  useEffect(() => {
    if (chatType === "individual" && selectedUsers.length === 1) {
      const user = friends.find(u => u.id === selectedUsers[0]);
      if (user) {
        setChatName(user.username || user.name);
      }
    }
  }, [selectedUsers, chatType, friends]);

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

  const handleButtonCreateChat = async () => {
    setError(null);

    // Verifica se è stato selezionato almeno un amico
    if (selectedUsers.length === 0) {
      setError("Seleziona almeno un amico per la chat.");
      return;
    }

    // Verifica se è stato scritto un messaggio
    if (!initialMessage.trim()) {
      setError("Devi scrivere un messaggio per creare la chat.");
      return;
    }

    else{
      handleCreateChat()
    }

    // Verifica se è stato inserito un nome per la chat di gruppo
    /*if (chatType === "group" && !chatName.trim()) {
      setError("Inserisci un nome per la chat di gruppo.");
      return;
    }*/


  };

  const handleCreateChat = async () => {
    setError(null);

    try {
      setCreating(true);

      // Gestione della creazione della chat individuale
      if (chatType === "individual") {
        const friendId = selectedUsers[0];

        // Verifica se l'utente è già un amico
        if (friends.some(friend => friend.id === friendId)) {
          const result = await API.createIndividualChatIfNotExists(friendId, initialMessage);

          // Se la chat esiste già, mostriamo un errore
          if (result.alreadyExists) {
            setError("Esiste già una chat con questo utente.");
            setTimeout(() => setError(null), 3000);
            setCreating(false);
            return;
          }

          // Se la chat è stata creata correttamente, navighiamo alla chat
          router.push(`../`);
        } else {
          setError("Non sei ancora amico con questo utente.");
          setTimeout(() => setError(null), 3000);
          setCreating(false);
        }
        return;
      }

      // Gestione per la creazione di una chat di gruppo
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


  // Funzione per ottenere il colore in base allo status
  const getStatusColor = (status) => {
    switch (status) {
      case "active": return "bg-green-500";
      case "pending": return "bg-yellow-500";
      case "blocked": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  // Verifica se il bottone deve essere disabilitato
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
