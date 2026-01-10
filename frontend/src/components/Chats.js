import React, { useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useLanguage } from '../LanguageContext';


const socket = io('https://jobportal-3-trrm.onrender.com');

function Chats({ initialChatId }) {
  const { t } = useLanguage();
  const username = localStorage.getItem('username');
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [search, setSearch] = useState('');
  const bodyRef = useRef(null);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimer = useRef(null);
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
        // Deduplicate message if it already exists from the HTTP response
        if (prev.some(m => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
    });

    socket.on('messageEdited', (updatedMessage) => {
      if (!activeChat || updatedMessage.chat !== activeChat._id) return;
      setMessages((prev) => prev.map((msg) => (msg._id === updatedMessage._id ? updatedMessage : msg)));
    });

    socket.on('messageDeleted', ({ messageId, chatId }) => {
      if (!activeChat || chatId !== activeChat._id) return;
      setMessages((prev) => prev.filter((msg) => msg._id !== messageId));
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
      socket.off('messageEdited');
      socket.off('messageDeleted');
    };
  }, [activeChat]);

  useEffect(() => {
    // auto scroll to bottom
    try { bodyRef.current && (bodyRef.current.scrollTop = bodyRef.current.scrollHeight); } catch {}
  }, [messages, activeChat]);

  const fetchChats = async () => {
    const res = await fetch(`https://jobportal-3-trrm.onrender.com/api/chats?username=${username}`);
    const data = await res.json();
    if (res.ok) {
      const sorted = [...data].sort((a,b)=> new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0));
      setChats(sorted);
    }
  };

  const openChat = async (chat) => {
    setActiveChat(chat);
    socket.emit('join', chat._id);
    const res = await fetch(`https://jobportal-3-trrm.onrender.com/api/chats/${chat._id}/messages`);
    const data = await res.json();
    if (res.ok) setMessages(data);
  };

  const sendMessage = async () => {
    if ((!text.trim() && !file) || !activeChat) return;

    const formData = new FormData();
    formData.append('username', username);
    formData.append('content', text);
    if (file) {
      formData.append('file', file);
    }

    const res = await fetch(`https://jobportal-3-trrm.onrender.com/api/chats/${activeChat._id}/messages`, {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    if (res.ok) {
      // The backend sends the new message in `data.data`
      if (data.data) {
        setMessages(prev => [...prev, data.data]);
      }
      setText('');
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleEditClick = (msg) => {
    setEditingMessageId(msg._id);
    setEditContent(msg.content || '');
  };

  const handleSaveEdit = async (messageId) => {
    if (!editContent.trim()) return;
    try {
      await fetch(`https://jobportal-3-trrm.onrender.com/api/messages/${messageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, content: editContent }),
      });
      // UI will update via socket event
      setEditingMessageId(null);
      setEditContent('');
    } catch (err) {
      console.error("Error editing message", err);
    }
  };

  const handleDelete = async (messageId) => {
    if (!window.confirm(t('delete_message_confirm'))) return;
    try {
      await fetch(`https://jobportal-3-trrm.onrender.com/api/messages/${messageId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });
      // UI will update via socket event
    } catch (err) {
      console.error("Error deleting message", err);
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
    <div className="chat-container" style={{ display: 'flex', height: '85vh', width: '95%', margin: '20px auto', border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#f9f9f9', flexDirection: isMobile ? 'column' : 'row' }}>
      {(!isMobile || !activeChat) && (
      <div className="chat-sidebar" style={{ width: isMobile ? '100%' : '300px', borderRight: isMobile ? 'none' : '1px solid #ddd', display: 'flex', flexDirection: 'column', backgroundColor: '#fff', height: isMobile ? '100%' : 'auto' }}>
        <div className="chat-search" style={{ padding: '10px', borderBottom: '1px solid #eee' }}>
          <input placeholder={t('search_jobs')} value={search} onChange={e => setSearch(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: '20px', border: '1px solid #ccc', outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <ul className="chat-list" style={{ listStyle: 'none', padding: 0, margin: 0, overflowY: 'auto', flex: 1 }}>
          {filtered.map(c => {
            const other = c.participants?.find(p => p.username !== username)?.username || t('unknown_user');
            const time = c.lastMessageAt ? new Date(c.lastMessageAt).toLocaleTimeString() : '';
            return (
              <li key={c._id} className={`chat-item ${activeChat?._id === c._id ? 'active' : ''}`} onClick={() => openChat(c)} style={{ display: 'flex', alignItems: 'center', padding: '15px', cursor: 'pointer', borderBottom: '1px solid #f0f0f0', backgroundColor: activeChat?._id === c._id ? '#e6f0ff' : 'transparent' }}>
                <div className="avatar" style={{ width: '45px', height: '45px', borderRadius: '50%', backgroundColor: '#007bff', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', marginRight: '15px', flexShrink: 0 }}>{other[0]?.toUpperCase() || '?'}</div>
                <div className="chat-meta" style={{ overflow: 'hidden', flex: 1 }}>
                  <span className="chat-name" style={{ fontWeight: 600, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#333' }}>{other} {time && <small style={{ marginLeft: '6px', color: '#6b7280', fontWeight: 'normal', fontSize: '0.8em' }}>{time}</small>}</span>
                  <span className="chat-sub" style={{ fontSize: '0.85rem', color: '#888', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>{c.job?.title}</span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
      )}
      {(!isMobile || activeChat) && (
      <div className="chat-main" style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#fff', height: isMobile ? '100%' : 'auto' }}>
        {activeChat ? (
          <>
            <div className="chat-header" style={{ padding: '15px 20px', borderBottom: '1px solid #ddd', display: 'flex', alignItems: 'center', backgroundColor: 'white', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', zIndex: 10 }}>
              {isMobile && <button onClick={() => setActiveChat(null)} style={{ marginRight: 10, background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', padding: '0 5px' }}>←</button>}
              <div className="avatar" style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#007bff', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', marginRight: '15px' }}>{(activeChat.participants?.find(p => p.username !== username)?.username || '?')[0]?.toUpperCase() || '?'}</div>
              <div>
                <div className="chat-title" style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{activeChat.participants?.find(p => p.username !== username)?.username || t('unknown_user')}</div>
                <div className="chat-subtitle" style={{ fontSize: '0.85rem', color: '#666' }}>{isTyping ? t('typing') : (activeChat.job?.title || '')}</div>
              </div>
            </div>
            <div className="chat-body" ref={bodyRef} style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '15px', backgroundColor: '#f5f7fb' }}>
              {messages.map(m => {
                const isOwn = m.sender?.username === username;
                return (
                  <div key={m._id} className={`msg ${isOwn ? 'me' : 'them'}`} style={{ display: 'flex', flexDirection: 'column', alignItems: isOwn ? 'flex-end' : 'flex-start', maxWidth: '70%', alignSelf: isOwn ? 'flex-end' : 'flex-start' }}>
                    <div style={{ padding: '12px 16px', borderRadius: '12px', position: 'relative', boxShadow: '0 1px 2px rgba(0,0,0,0.1)', wordWrap: 'break-word', backgroundColor: isOwn ? '#007bff' : '#fff', color: isOwn ? 'white' : '#333', border: isOwn ? 'none' : '1px solid #eee', borderBottomRightRadius: isOwn ? '2px' : '12px', borderBottomLeftRadius: isOwn ? '12px' : '2px' }}>
                    {editingMessageId === m._id ? (
                      <div style={{ minWidth: '200px' }}>
                        <textarea 
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          style={{ width: '100%', boxSizing: 'border-box', padding: '5px', borderRadius: '4px', border: '1px solid #ccc', color: '#333' }}
                          autoFocus
                        />
                        <div style={{ textAlign: 'right', marginTop: '5px', display: 'flex', gap: '5px', justifyContent: 'flex-end' }}>
                          <button onClick={() => handleSaveEdit(m._id)} style={{ padding: '4px 8px', fontSize: '0.8rem', cursor: 'pointer', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px' }}>{t('save')}</button>
                          <button onClick={() => setEditingMessageId(null)} style={{ padding: '4px 8px', fontSize: '0.8rem', cursor: 'pointer', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px' }}>{t('cancel')}</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div style={{ fontSize: '0.95rem', lineHeight: 1.4 }}>
                          {m.content}
                          {m.fileUrl && (
                            <div style={{ marginTop: '5px', background: 'rgba(0,0,0,0.1)', padding: '5px', borderRadius: '4px' }}>
                                <a href={m.fileUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>📄 {m.fileName || 'Attachment'}</a>
                            </div>
                          )}
                          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '5px', marginTop: '5px', fontSize: '0.7rem', opacity: 0.8 }}>
                            <span>{new Date(m.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            {m.edited && <em style={{ fontStyle: 'italic' }}> (edited)</em>}
                          </div>
                        </div>
                      </>
                    )}
                    </div>
                    {isOwn && editingMessageId !== m._id && (
                        <div className="message-actions" style={{ display: 'flex', gap: '5px', marginTop: '2px' }}>
                        <button onClick={() => handleEditClick(m)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', padding: '2px' }} title="Edit">✏️</button>
                        <button onClick={() => handleDelete(m._id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', padding: '2px' }} title="Delete">🗑️</button>
                        </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="chat-input" style={{ padding: '15px 20px', backgroundColor: 'white', borderTop: '1px solid #ddd', display: 'flex', alignItems: 'flex-end', gap: '10px' }}>
              <button type="button" className="attach-btn" onClick={() => fileInputRef.current.click()} title="Attach File" style={{ padding: 0, width: '40px', height: '40px', border: 'none', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f0f0', fontSize: '1.2rem' }}>📎</button>
              <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={(e) => setFile(e.target.files[0])} />
              <div className="input-wrapper" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {file && (
                  <div className="file-preview" style={{ fontSize: '0.85rem', color: '#666', background: '#f0f0f0', padding: '5px 10px', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>📄 {file.name}</span>
                    <button type="button" onClick={() => { setFile(null); fileInputRef.current.value = ''; }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold', color: '#ff4d4f' }}>×</button>
                  </div>
                )}
                <textarea
                  value={text}
                  onChange={e => setText(e.target.value)}
                  placeholder={t('type_message')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
                  }}
                  onInput={() => { if (activeChat) socket.emit('typing', { chatId: activeChat._id, username }); }}
                  style={{ width: '100%', padding: '12px', border: '1px solid #ccc', borderRadius: '20px', resize: 'none', height: '45px', minHeight: '45px', maxHeight: '120px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                />
              </div>
              <button className="send-btn" onClick={sendMessage} style={{ padding: '0 20px', height: '40px', border: 'none', borderRadius: '20px', cursor: 'pointer', backgroundColor: '#007bff', color: 'white', fontWeight: 'bold' }}>{t('send')}</button>
            </div>
          </>
        ) : (
          <div className="chat-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: '#6b7280', fontSize: '1.2rem' }}>{t('select_chat_to_start')}</div>
        )}
      </div>
      )}
    </div>
  );
}

export default Chats;