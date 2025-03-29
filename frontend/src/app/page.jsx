// src/app/page.js

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import API from '@/lib/api';

export default function Home() {
  // value and function that we want to change, useState for add state at functional components
  const [chats, setChats] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  //  Client Component, the data will loads like this
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Ottieni l'utente corrente
        const user = await API.getCurrentUser();
        setCurrentUser(user);
        
        // Ottieni tutte le chat
        const fetchedChats = await API.getChats();
        setChats(fetchedChats);
        setLoading(false);
      } catch (err) {
        console.error('Errore nel caricamento dei dati:', err);
        setError('Si è verificato un errore nel caricamento delle chat. Riprova più tardi.');
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleChatClick = async (chatId) => {
    try {
      // Marca la chat come letta quando l'utente ci clicca sopra
      if (chatId) {
        await API.markChatAsRead(chatId);
        
        // Aggiorna lo stato delle chat per riflettere che è stata letta
        setChats(chats.map(chat => 
          chat.id === chatId 
            ? { ...chat, unreadCount: 0, lastMessage: { ...chat.lastMessage, read: true } } 
            : chat
        ));
        
        // Naviga alla pagina della chat
        router.push(`/chat/${chatId}`);
      }
    } catch (err) {
      console.error('Errore nell\'apertura della chat:', err);
      setError('Si è verificato un errore nell\'apertura della chat. Riprova più tardi.');
    }
  };

  // Formatta la data/ora in un formato leggibile
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    // Meno di 24 ore fa: mostra solo l'ora
    if (diff < 24 * 60 * 60 * 1000) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // Meno di 7 giorni fa: mostra il giorno della settimana
    if (diff < 7 * 24 * 60 * 60 * 1000) {
      return date.toLocaleDateString([], { weekday: 'short' });
    }
    
    // Altrimenti mostra la data
    return date.toLocaleDateString();
  };

  // Always on condition
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

  // The main page after all the previous if are not choosen
  return (
    <div className="page-container">
      {/* Header */}
      <header className="page-header">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">BicoChat</h1>
          {currentUser && (
            <Link href="/profile" className="flex items-center">
              <img 
                src={currentUser.avatar || "https://dummyimage.com/40x40/000/fff&text=Boh?"}
                alt={currentUser.name} 
                className="w-8 h-8 rounded-full mr-2"
              />
              <span>{currentUser.name}</span>
            </Link>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="page-content">
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold">Le tue chat</h2>
          </div>
          
          <div>
            {chats.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                Non hai ancora chat attive.
              </div>
            ) : (
              <div className="divide-y">
                {chats.map(chat => (
                  <div 
                    key={chat.id} 
                    className={`chat-list-item ${chat.unreadCount > 0 ? 'unread' : ''}`}
                    onClick={() => handleChatClick(chat.id)}
                  >
                    {/* Avatar della chat */}
                    <div className="chat-avatar">
                      <img 
                        src="https://dummyimage.com/48x48/000/fff&text=Generica?"
                        alt={chat.name} 
                        className="chat-avatar-image"
                      />
                      {chat.type === 'group' && (
                        <span className="chat-type-indicator">
                          G
                        </span>
                      )}
                    </div>
                    
                    {/* Dettagli della chat */}
                    <div className="chat-info">
                      <div className="chat-header">
                        <h3 className="chat-name">{chat.name}</h3>
                        <span className="chat-time">
                          {chat.lastMessage && formatTimestamp(chat.lastMessage.timestamp)}
                        </span>
                      </div>
                      
                      {chat.lastMessage && (
                        <div className="chat-last-message">
                          <p className="chat-message-preview">
                            {chat.type === 'group' && chat.lastMessage.sender !== 'currentUser' && (
                              <span className="font-medium">{chat.lastMessage.senderName || 'Utente'}: </span>
                            )}
                            {chat.lastMessage.content}
                          </p>
                          
                          {chat.unreadCount > 0 && (
                            <span className="badge-notification">
                              {chat.unreadCount > 9 ? '9+' : chat.unreadCount}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Pulsante per creare una nuova chat */}
        <Link 
          href="/new-chat" 
          className="btn-floating"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </Link>
      </main>
    </div>
  );
}