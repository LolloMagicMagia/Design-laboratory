// src/app/chat/[id]/page.jsx
'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import API from '@/lib/api';

export default function ChatPage({ params }) {
  const chatId = params.id;
  const [chat, setChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const router = useRouter();

  // Fetch iniziale dei dati
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Ottieni l'utente corrente
        const user = await API.getCurrentUser();
        setCurrentUser(user);
        
        // Ottieni i dettagli della chat
        const chatData = await API.getChatById(chatId);
        setChat(chatData);
        
        // Marca la chat come letta
        await API.markChatAsRead(chatId);
        
        // Ottieni i messaggi della chat
        const messagesData = await API.getMessagesByChatId(chatId);
        setMessages(messagesData);
        
        setLoading(false);
      } catch (err) {
        console.error('Errore nel caricamento dei dati:', err);
        setError('Si è verificato un errore nel caricamento della chat. Riprova più tardi.');
        setLoading(false);
      }
    };

    fetchData();
    
    // Polling per aggiornamenti (simula una connessione real-time)
    const interval = setInterval(async () => {
      try {
        const updatedMessages = await API.getMessagesByChatId(chatId);
        if (JSON.stringify(updatedMessages) !== JSON.stringify(messages)) {
          setMessages(updatedMessages);
        }
      } catch (err) {
        console.error('Errore nell\'aggiornamento dei messaggi:', err);
      }
    }, 5000); // Controlla ogni 5 secondi
    
    return () => clearInterval(interval);
  }, [chatId]);

  // Scorrimento automatico ai messaggi più recenti
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim()) return;
    
    try {
      setSendingMessage(true);
      
      // Invia il messaggio
      await API.sendMessage(chatId, newMessage.trim());
      
      // Aggiorna l'elenco dei messaggi
      const updatedMessages = await API.getMessagesByChatId(chatId);
      setMessages(updatedMessages);
      
      // Resetta il campo di input
      setNewMessage('');
      setSendingMessage(false);
    } catch (err) {
      console.error('Errore nell\'invio del messaggio:', err);
      setError('Si è verificato un errore nell\'invio del messaggio. Riprova più tardi.');
      setSendingMessage(false);
    }
  };

  const formatMessageTime = (timestamp) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatMessageDate = (timestamp) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Oggi';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Ieri';
    } else {
      return date.toLocaleDateString();
    }
  };

  // Raggruppa i messaggi per data
  const groupMessagesByDate = () => {
    const groups = {};
    
    messages.forEach(message => {
      const date = message.timestamp ? new Date(message.timestamp) : new Date();
      const dateString = date.toDateString();
      
      if (!groups[dateString]) {
        groups[dateString] = [];
      }
      
      groups[dateString].push(message);
    });
    
    return Object.entries(groups).map(([date, msgs]) => ({
      date,
      messages: msgs,
      formattedDate: formatMessageDate(date)
    }));
  };

  // Ottiene il nome dell'altro partecipante in una chat individuale
  const getOtherParticipantId = () => {
    if (!chat || chat.type !== 'individual') return null;
    
    return chat.participants.find(id => id !== 'currentUser');
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

  if (!chat) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="text-red-500 mb-4">Chat non trovata</div>
        <Link 
          href="/" 
          className="btn btn-primary"
        >
          Torna alla lista chat
        </Link>
      </div>
    );
  }

  const messageGroups = groupMessagesByDate();
  const otherParticipantId = getOtherParticipantId();

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
          
          <div className="flex items-center ml-3">
            <img 
              src="https://dummyimage.com/40x40/000/fff&text=M"
              alt={chat.name} 
              className="user-avatar"
              style={{ width: "40px", height: "40px" }}
            />
            <div className="ml-3">
              <h1 className="font-semibold">{chat.name}</h1>
              {chat.type === 'group' ? (
                <p className="text-xs text-gray-500">{chat.participants.length} partecipanti</p>
              ) : (
                <div className="user-status">
                  <span className="status-indicator status-online"></span>
                  <span>Online</span>
                </div>
              )}
            </div>
          </div>
          
          {otherParticipantId && (
            <Link 
              href={`/user/${otherParticipantId}`} 
              className="btn btn-icon ml-auto"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </Link>
          )}
        </div>
      </header>

      {/* Main content - Messages */}
      <main className="page-content p-0">
        <div className="chat-container">
          <div className="message-list">
            {messageGroups.map(group => (
              <div key={group.date} className="message-group">
                {/* Date divider */}
                <div className="message-date">
                  <span className="message-date-text">
                    {group.formattedDate}
                  </span>
                </div>
                
                {/* Messages for this date */}
                <div className="space-y-3">
                  {group.messages.map(message => {
                    const isCurrentUser = message.sender === 'currentUser';
                    
                    return (
                      <div 
                        key={message.id} 
                        className={`message ${isCurrentUser ? 'message-sent' : 'message-received'}`}
                      >
                        {!isCurrentUser && chat.type === 'group' && (
                          <p className="text-xs font-semibold mb-1">
                            {message.senderName || 'Utente'}
                          </p>
                        )}
                        <p>{message.content}</p>
                        <p className="message-time">
                          {formatMessageTime(message.timestamp)}
                          {isCurrentUser && (
                            <span className="ml-1">
                              {message.read ? '✓✓' : '✓'}
                            </span>
                          )}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            
            {/* Dummy div for auto-scroll */}
            <div ref={messagesEndRef} />
          </div>

          {/* Message input */}
          <div className="message-input-container">
            <form onSubmit={handleSendMessage} className="message-input-form">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Scrivi un messaggio..."
                className="message-input"
                disabled={sendingMessage}
              />
              <button
                type="submit"
                className="message-send-button"
                disabled={!newMessage.trim() || sendingMessage}
              >
                {sendingMessage ? (
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}