// src/app/new-chat/page.jsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import API from '@/lib/api';

export default function NewChatPage() {
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [chatName, setChatName] = useState('');
  const [chatType, setChatType] = useState('individual');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        // Otteniamo tutte le chat per estrarre gli utenti
        const chats = await API.getChats();
        
        // Raccogliamo gli IDs di tutti gli utenti dalle chat
        const userIdsSet = new Set();
        chats.forEach(chat => {
          chat.participants.forEach(participantId => {
            if (participantId !== 'currentUser') {
              userIdsSet.add(participantId);
            }
          });
        });
        
        // Convertiamo il Set in Array
        const userIds = Array.from(userIdsSet);
        
        // Otteniamo i dettagli per ogni utente
        const usersData = await Promise.all(
          userIds.map(async (userId) => {
            try {
              return await API.getUserById(userId);
            } catch (error) {
              console.error(`Errore nel recupero dell'utente ${userId}:`, error);
              return null;
            }
          })
        );
        
        // Filtriamo eventuali null
        const validUsers = usersData.filter(user => user !== null);
        
        setUsers(validUsers);
        setLoading(false);
      } catch (err) {
        console.error('Errore nel caricamento degli utenti:', err);
        setError('Si è verificato un errore nel caricamento degli utenti. Riprova più tardi.');
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  // Aggiorna automaticamente il nome della chat per le chat individuali
  useEffect(() => {
    if (chatType === 'individual' && selectedUsers.length === 1) {
      const user = users.find(u => u.id === selectedUsers[0]);
      if (user) {
        setChatName(user.name);
      }
    }
  }, [selectedUsers, chatType, users]);

  const handleUserToggle = (userId) => {
    setSelectedUsers(prevSelected => {
      if (prevSelected.includes(userId)) {
        // Rimuovi l'utente dalla selezione
        return prevSelected.filter(id => id !== userId);
      } else {
        // Aggiungi l'utente alla selezione
        if (chatType === 'individual' && prevSelected.length === 1) {
          // Per le chat individuali, permetti solo un utente selezionato
          return [userId];
        }
        return [...prevSelected, userId];
      }
    });
  };

  const handleCreateChat = async () => {
    // Validazione
    if (selectedUsers.length === 0) {
      setError('Seleziona almeno un utente per la chat.');
      return;
    }

    if (chatType === 'group' && !chatName.trim()) {
      setError('Inserisci un nome per la chat di gruppo.');
      return;
    }

    try {
      setCreating(true);
      
      // Se è una chat individuale e l'utente esiste già in una chat, naviga a quella
      if (chatType === 'individual') {
        const chats = await API.getChats();
        const existingChat = chats.find(chat => 
          chat.type === 'individual' && 
          chat.participants.includes(selectedUsers[0]) && 
          chat.participants.includes('currentUser')
        );
        
        if (existingChat) {
          router.push(`/chat/${existingChat.id}`);
          return;
        }
      }
      
      // Crea una nuova chat
      const newChat = await API.createChat({
        name: chatName,
        type: chatType,
        participants: ['currentUser', ...selectedUsers]
      });
      
      // Naviga alla nuova chat
      router.push(`/chat/${newChat.id}`);
    } catch (err) {
      console.error('Errore nella creazione della chat:', err);
      setError('Si è verificato un errore nella creazione della chat. Riprova più tardi.');
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl font-semibold">Caricamento...</div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Header */}
      <header className="page-header">
        <div className="container mx-auto flex items-center">
          <button 
            onClick={() => router.push('/')} 
            className="btn btn-icon"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold ml-3">Nuova chat</h1>
        </div>
      </header>

      {/* Main content */}
      <main className="page-content">
        <div className="card">
          {/* Tipo di chat */}
          <div className="card-header">
            <h2 className="text-lg font-semibold mb-4">Tipo di chat</h2>
            <div className="flex space-x-4">
              <button 
                onClick={() => {
                  setChatType('individual');
                  // Limita a un solo utente per chat individuali
                  if (selectedUsers.length > 1) {
                    setSelectedUsers([selectedUsers[0]]);
                  }
                }}
                className={`btn ${
                  chatType === 'individual' 
                    ? 'btn-primary' 
                    : 'btn-secondary'
                }`}
              >
                Individuale
              </button>
              <button 
                onClick={() => setChatType('group')}
                className={`btn ${
                  chatType === 'group' 
                    ? 'btn-primary' 
                    : 'btn-secondary'
                }`}
              >
                Gruppo
              </button>
            </div>
          </div>

          {/* Nome chat (solo per gruppi) */}
          {chatType === 'group' && (
            <div className="card-content border-b">
              <div className="form-group">
                <label htmlFor="chatName" className="form-label">
                  Nome del gruppo
                </label>
                <input
                  type="text"
                  id="chatName"
                  value={chatName}
                  onChange={(e) => setChatName(e.target.value)}
                  placeholder="Es. Amici, Lavoro, Famiglia..."
                  className="form-input"
                />
              </div>
            </div>
          )}
          
          {/* Selezione utenti */}
          <div className="card-content">
            <h2 className="text-lg font-semibold mb-4">Seleziona utenti</h2>
            
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}
            
            <div className="user-list">
              {users.length === 0 ? (
                <div className="py-4 text-center text-gray-500">
                  Nessun utente disponibile.
                </div>
              ) : (
                users.map(user => (
                  <div 
                    key={user.id} 
                    className="user-list-item"
                  >
                    <input
                      type="checkbox"
                      id={`user-${user.id}`}
                      checked={selectedUsers.includes(user.id)}
                      onChange={() => handleUserToggle(user.id)}
                      className="h-5 w-5 text-blue-600"
                      disabled={chatType === 'individual' && selectedUsers.length === 1 && !selectedUsers.includes(user.id)}
                    />
                    <label 
                      htmlFor={`user-${user.id}`}
                      className="ml-3 flex items-center cursor-pointer flex-1"
                    >
                      <img 
                        src={user.avatar || "https://dummyimage.com/40x40/000/fff&text=P"}
                        alt={user.name} 
                        className="user-avatar"
                        style={{ width: "40px", height: "40px" }}
                      />
                      <div className="user-info">
                        <p className="user-name">{user.name}</p>
                        <div className="user-status">
                          <span className={`status-indicator ${
                            user.status === 'online' ? 'status-online' : 'status-offline'
                          }`}></span>
                          <span className="capitalize">{user.status}</span>
                        </div>
                      </div>
                    </label>
                  </div>
                ))
              )}
            </div>
          </div>
          
          {/* Pulsanti di azione */}
          <div className="card-footer flex justify-end">
            <button 
              onClick={() => router.push('/')}
              className="btn btn-secondary mr-2"
            >
              Annulla
            </button>
            <button 
              onClick={handleCreateChat}
              className="btn btn-primary"
              disabled={selectedUsers.length === 0 || (chatType === 'group' && !chatName.trim()) || creating}
            >
              {creating ? 'Creazione in corso...' : 'Crea Chat'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}