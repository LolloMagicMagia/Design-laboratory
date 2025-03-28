
// src/app/chats/page.jsx
/*"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import API from '../../lib/api';
import './styles.css';

export default function ChatListPage() {
  const router = useRouter();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Funzione per navigare a una chat specifica
  const navigateToChat = (chatId) => {
    router.push(`/chat/${chatId}`);
  };
  
  // Funzione per formattare la data dell'ultimo messaggio
  const formatMessageTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Timestamp è di oggi
    if (date >= today) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    // Timestamp è di ieri
    else if (date >= yesterday) {
      return 'Ieri';
    }
    // Timestamp è di questa settimana
    else if (now.getTime() - date.getTime() < 7 * 24 * 60 * 60 * 1000) {
      const days = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
      return days[date.getDay()];
    }
    // Timestamp è più vecchio
    else {
      return date.toLocaleDateString([], { day: 'numeric', month: 'numeric' });
    }
  };
  
  // Recupera le chat all'avvio del componente
  useEffect(() => {
    const fetchChats = async () => {
      try {
        setLoading(true);
        const chatsData = await API.getChats();
        setChats(chatsData);
        setLoading(false);
      } catch (err) {
        setError('Impossibile caricare le chat');
        setLoading(false);
        console.error(err);
      }
    };
    
    fetchChats();
  }, []);
  
  // Filtra le chat in base al termine di ricerca
  const filteredChats = chats.filter(chat => 
    chat.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  return (
    <div className="chat-list-container">
      <div className="chat-list-header">
        <h1>Le tue chat</h1>
        <button className="new-chat-button">
          <span>+</span> Nuova chat
        </button>
      </div>
      
      <div className="search-container">
        <input 
          type="text" 
          placeholder="Cerca nelle chat..." 
          className="search-input"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      
      <div className="chat-list">
        {loading ? (
          <div className="loading-state">Caricamento chat in corso...</div>
        ) : error ? (
          <div className="error-state">{error}</div>
        ) : filteredChats.length === 0 ? (
          <div className="empty-state">
            {searchTerm ? 'Nessuna chat corrisponde alla ricerca' : 'Non hai ancora chat'}
          </div>
        ) : (
          filteredChats.map(chat => (
            <div 
              key={chat.id} 
              className={`chat-item ${chat.unreadCount > 0 ? 'unread' : ''}`} 
              onClick={() => navigateToChat(chat.id)}
            >
              <div className="chat-avatar">
                <img src={chat.avatar || '/api/placeholder/40/40'} alt="Avatar" />
              </div>
              <div className="chat-content">
                <div className="chat-info">
                  <h3 className="chat-name">{chat.name}</h3>
                  <span className="chat-time">
                    {chat.lastMessage ? formatMessageTime(chat.lastMessage.timestamp) : ''}
                  </span>
                </div>
                <div className="chat-preview">
                  <p className="chat-message">
                    {chat.lastMessage ? (
                      chat.type === 'group' && chat.lastMessage.sender !== 'currentUser' ? 
                        `${chat.lastMessage.senderName}: ${chat.lastMessage.content}` : 
                        chat.lastMessage.content
                    ) : (
                      'Inizia una conversazione'
                    )}
                  </p>
                  {chat.unreadCount > 0 && (
                    <div className="chat-badge">{chat.unreadCount}</div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}*/

