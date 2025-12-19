import React, { useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useLanguage } from '../LanguageContext';
import '../chat.css';

const socket = io();

function Chats({ initialChatId }) {
  const { t } = useLanguage();
  const username = localStorage.getItem('username');
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  const bodyRef = useRef(null);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimer = useRef(null);

  useEffect(() => {
    fetchChats();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (!initialChatId) return;
    if (chats.length === 0) return; // will re-run when chats load
    const chat = chats.find(c => c._id === initialChatId);
    if (chat) openChat(chat);
    // eslint-disable-next-line
  }, [initialChatId, chats]);

  useEffect(() => {
    socket.on('newMessage', (msg) => {
      setMessages(prev => {
        if (!activeChat || msg.chat !== activeChat._id) return prev;
        return [...prev, msg];
      });
    });
    socket.on('typing', ({ chatId, username: u }) => {
      if (!activeChat || chatId !== activeChat._id) return;
      setIsTyping(true);
      clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => setIsTyping(false), 1200);
    });
    return () => {
      socket.off('newMessage');
      socket.off('typing');
    };
  }, [activeChat]);

  useEffect(() => {
    // auto scroll to bottom
    try { bodyRef.current && (bodyRef.current.scrollTop = bodyRef.current.scrollHeight); } catch {}
  }, [messages, activeChat]);

  const fetchChats = async () => {
    const res = await fetch(`/api/chats?username=${username}`);
    const data = await res.json();
    if (res.ok) {
      const sorted = [...data].sort((a,b)=> new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0));
      setChats(sorted);
    }
  };

  const openChat = async (chat) => {
    setActiveChat(chat);
    socket.emit('join', chat._id);
    const res = await fetch(`/api/chats/${chat._id}/messages`);
    const data = await res.json();
    if (res.ok) setMessages(data);
  };

  const sendMessage = async () => {
    if (!text.trim() || !activeChat) return;
    const res = await fetch(`/api/chats/${activeChat._id}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, content: text })
    });
    const data = await res.json();
    if (res.ok) {
      setMessages(prev => [...prev, data]);
      setText('');
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return chats;
    return chats.filter(c => {
      const other = c.participants?.find(p => p.username !== username)?.username || '';
      return other.toLowerCase().includes(q) || (c.job?.title || '').toLowerCase().includes(q);
    });
  }, [search, chats, username]);

  return (
    <div className="chat-container">
      <div className="chat-sidebar">
        <div className="chat-search">
          <input placeholder={t('search_jobs')} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <ul className="chat-list">
          {filtered.map(c => {
            const other = c.participants?.find(p => p.username !== username)?.username || t('unknown_user');
            const time = c.lastMessageAt ? new Date(c.lastMessageAt).toLocaleTimeString() : '';
            return (
              <li key={c._id} className={`chat-item ${activeChat?._id === c._id ? 'active' : ''}`} onClick={() => openChat(c)}>
                <div className="avatar">{other[0]?.toUpperCase() || '?'}</div>
                <div className="chat-meta">
                  <span className="chat-name">{other} {time && <small style={{marginLeft:6,color:'#6b7280'}}>{time}</small>}</span>
                  <span className="chat-sub">{c.job?.title}</span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="chat-main">
        {activeChat ? (
          <>
            <div className="chat-header">
              <div className="avatar">{(activeChat.participants?.find(p => p.username !== username)?.username || '?')[0]?.toUpperCase() || '?'}</div>
              <div>
                <div className="chat-title">{activeChat.participants?.find(p => p.username !== username)?.username || t('unknown_user')}</div>
                <div className="chat-subtitle">{isTyping ? t('typing') : (activeChat.job?.title || '')}</div>
              </div>
            </div>
            <div className="chat-body" ref={bodyRef}>
              {messages.map(m => (
                <div key={m._id} className={`msg ${m.sender?.username === username ? 'me' : 'them'}`}>
                  {m.content}
                  <span className="msg-time">{new Date(m.createdAt || Date.now()).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
            <div className="chat-input">
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder={t('type_message')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
                }}
                onInput={() => { if (activeChat) socket.emit('typing', { chatId: activeChat._id, username }); }}
              />
              <button className="send-btn" onClick={sendMessage}>{t('send')}</button>
            </div>
          </>
        ) : (
          <div className="chat-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{t('select_chat_to_start')}</div>
        )}
      </div>
    </div>
  );
}

export default Chats;