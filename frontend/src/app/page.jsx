'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import API from '@/lib/api';

export default function Home() {
  const [chats, setChats] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const user = await API.getCurrentUser();
        setCurrentUser(user);
        localStorage.setItem('currentUserId', user.id);

        const fetchedChats = await API.getChatsWithResolvedNames();
        console.error("fetchedChats", fetchedChats);
        setChats(fetchedChats);
        setLoading(false);
      } catch (err) {
        console.error('Errore nel caricamento dei dati:', err);
        setError('Errore nel caricamento delle chat.');
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleChatClick = async (chatId, chatName, lastUser, unreadCount) => {
    console.error('tutto: ',chatId, " ", chatName, " ", lastUser, " ", unreadCount);
    try {
      // Aggiungi un controllo aggiuntivo per currentUser
      if (!currentUser) {
        console.error('Utente non loggato');
        return;
      }

      // Se ci sono messaggi non letti, procedi solo se l'ultimo messaggio non è stato inviato dall'utente loggato
      if (unreadCount > 0 && lastUser !== currentUser.id) {
        try {
          // Aggiungi await esplicito e gestisci il risultato
          console.error('Prima di result:');
          const result = await API.markChatAsRead(chatId);
          console.log('Chat marcata come letta:', result);
        } catch (markReadError) {
          console.error('Errore nel marcare la chat come letta:', markReadError);
          // Puoi decidere se continuare comunque o fermarti qui
        }
      }

      // Dopo aver aggiornato i messaggi, naviga alla chat
      router.push(`/chat/${chatId}?name=${encodeURIComponent(chatName)}`);
    } catch (err) {
      console.error('Errore apertura chat:', err);
      setError('Impossibile aprire la chat.');
    }
  };

  // Funzione per determinare lo stato di lettura
  const renderReadStatus = (lastUser, unreadCount) => {
    if (!currentUser) return null;

    if (lastUser === currentUser.id) {
      return (
          <span className="message-read-status text-green-500 font-bold">
        {unreadCount > 0 ? '✓' : '✓✓'}
      </span>
      );
    }

    if (unreadCount > 0) {
      return (
          <span className="message-unread-status text-red-500 font-bold">
        {unreadCount > 9 ? '9+' : unreadCount}
      </span>
      );
    }
    return null;
  };


  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Caricamento...</div>;
  }

  if (error) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
          <div className="text-red-500 mb-4">{error}</div>
          <button onClick={() => window.location.reload()} className="btn btn-primary">Riprova</button>
        </div>
    );
  }

  return (
      <div className="page-container">
        <header className="page-header">
          <div className="container mx-auto flex justify-between items-center">
            <h1 className="text-xl font-bold">BicoChat</h1>
            {currentUser && (
                <Link href="/profile" className="flex items-center">
                  <img
                      src={currentUser.avatar || "https://dummyimage.com/40x40/000/fff&text=U"}
                      alt={currentUser.username}
                      className="w-8 h-8 rounded-full mr-2"
                  />
                  <span>{currentUser.username}</span>
                </Link>
            )}
          </div>
        </header>
        <main className="page-content">
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-semibold">Le tue chat</h2>
            </div>
            <div>
              {chats.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">Nessuna chat attiva.</div>
              ) : (
                  <div className="divide-y">
                    {chats.map(chat => (
                        <div
                            key={chat.chatId}
                            className={`chat-list-item ${chat.unreadCount > 0 ? 'unread' : ''}`}
                            onClick={() => handleChatClick(chat.chatId, chat.name, chat.lastUser, chat.unreadCount)}
                        >
                          {/* Avatar della chat */}
                          <div className="chat-avatar">
                            <img
                                src="https://dummyimage.com/48x48/000/fff&text=C"
                                alt={chat.name}
                                className="chat-avatar-image"
                            />
                          </div>

                          {/* Informazioni della chat */}
                          <div className="chat-info">
                            <div className="chat-header">
                              {/* Nome della chat con icona */}
                              <h3 className="chat-name flex items-center">
                                {chat.name}
                              </h3>
                              {/* Ora dell'ultimo messaggio */}
                              <span className="chat-time">{chat.timestamp}</span>
                            </div>

                            {/* Ultimo messaggio ricevuto/inviato con stato a sinistra */}
                            <div className="flex items-center">
                              <span className="mr-2">{renderReadStatus(chat.lastUser, chat.unreadCount)}</span>
                              <span className="   chat-message-preview">{chat.lastMessage}</span>
                            </div>
                          </div>
                        </div>
                    ))}
                  </div>
              )}
            </div>
          </div>
          <Link href="/new-chat" className="btn-floating">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </Link>
        </main>
      </div>
  );
}
