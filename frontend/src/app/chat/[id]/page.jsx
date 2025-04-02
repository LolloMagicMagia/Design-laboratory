'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import API from '@/lib/api';

export default function ChatPage() {
  const params = useParams();  // <-- usa useParams
  const chatId = params?.id;
  const [chat, setChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [error, setError] = useState(null);
  const [usersMap, setUsersMap] = useState({});
  const messagesEndRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    const id = localStorage.getItem('currentUserId');
    if (!id) {
      setError('Utente non autenticato');
      return;
    }
    setCurrentUserId(id);

    const fetchData = async () => {
      try {
        const chatData = await API.getChatById(chatId);
        setChat(chatData);
        await API.markChatAsRead(chatId);
        const messagesData = await API.getMessagesByChatId(chatId);
        setMessages(messagesData);

        const userIds = [...new Set(chatData.participants)];
        const users = await Promise.all(userIds.map(uid => API.getUserById(uid)));
        const map = {};
        users.forEach(u => map[u.id] = u);
        setUsersMap(map);

        setLoading(false);
      } catch (err) {
        console.error('Errore nel caricamento dei dati:', err);
        setError('Errore nel caricamento della chat. Riprova più tardi.');
        setLoading(false);
      }
    };

    fetchData();

    const interval = setInterval(async () => {
      try {
        const updatedMessages = await API.getMessagesByChatId(chatId);
        if (JSON.stringify(updatedMessages) !== JSON.stringify(messages)) {
          setMessages(updatedMessages);
        }
      } catch (err) {
        console.error('Errore aggiornamento messaggi:', err);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [chatId]);

  //useEffect(() => {
  //  messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  //}, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    try {
      setSendingMessage(true);
      await API.sendMessage(chatId, newMessage.trim(), currentUserId);
      const updatedMessages = await API.getMessagesByChatId(chatId);
      setMessages(updatedMessages);
      setNewMessage('');
    } catch (err) {
      console.error('Errore invio messaggio:', err);
      setError('Errore nell\'invio del messaggio. Riprova più tardi.');
    } finally {
      setSendingMessage(false);
    }
  };

  const formatMessageTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const groupMessagesByDate = () => {
    const groups = {};
    messages.forEach(message => {
      const date = new Date(message.timestamp || Date.now()).toDateString();
      if (!groups[date]) groups[date] = [];
      groups[date].push(message);
    });
    return Object.entries(groups).map(([date, msgs]) => ({ date, messages: msgs }));
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen text-xl font-semibold">Caricamento...</div>;
  }

  if (error) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
          <div className="text-red-500 mb-4">{error}</div>
          <button onClick={() => window.location.reload()} className="btn btn-primary">Riprova</button>
        </div>
    );
  }

  const isGroup = chat.type === 'group';
  const otherUser = !isGroup && chat.participants.find(pid => pid !== currentUserId);
  const chatTitle = isGroup ? chat.name : usersMap[otherUser]?.name || 'Utente';
  const chatAvatar = isGroup
      ? chat.avatar || 'https://dummyimage.com/40x40/000/fff&text=G'
      : usersMap[otherUser]?.avatar || 'https://dummyimage.com/40x40/000/fff&text=U';

  const messageGroups = groupMessagesByDate();

  return (
      <div className="page-container flex flex-col h-screen">
        <header className="page-header">
          <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center">
              <button onClick={() => router.back()} className="btn btn-icon p-2 rounded-full hover:bg-gray-200">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="ml-4 font-semibold">{chatTitle}</h1>
            </div>
            <img
                src={chatAvatar}
                alt={chatTitle}
                className="user-avatar"
                style={{ width: '40px', height: '40px', borderRadius: '9999px', objectFit: 'cover' }}
            />
          </div>
        </header>

        <main className="flex-1 flex flex-col justify-between overflow-hidden">
          <div className="chat-container flex-1 overflow-y-auto">
            <div className="message-list px-4 py-2">
              {messageGroups.map(group => (
                  <div key={group.date} className="message-group">
                    <div className="message-date">
                      <span className="message-date-text">{group.date}</span>
                    </div>
                    <div className="space-y-3">
                      {group.messages.map(msg => {
                        const isMine = msg.sender === currentUserId;
                        const senderName = usersMap[msg.sender]?.username || 'Utente';
                        return (
                            <div key={msg.id} className={`message ${isMine ? 'message-sent' : 'message-received'}`}>
                              {!isMine && isGroup && (
                                  <p className="text-xs font-bold mb-1">{senderName}</p>
                              )}
                              <p>{msg.content}</p>
                              <p className="message-time">
                                {formatMessageTime(msg.timestamp)}
                                {isMine && <span className="ml-1">{msg.read ? '✓✓' : '✓'}</span>}
                              </p>
                            </div>
                        );
                      })}
                    </div>
                  </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>

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
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                      <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.37 0 0 5.37 0 12h4z" className="opacity-75" />
                    </svg>
                ) : (
                    <svg className="h-5 w-5" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                )}
              </button>
            </form>
          </div>
        </main>
      </div>
  );
}
