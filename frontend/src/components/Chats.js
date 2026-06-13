import React, { useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useLanguage } from '../LanguageContext';

const BACKEND_URL = 'https://jobportal-5-b3v6.onrender.com';
const socket = io(BACKEND_URL);

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

  const fetchChats = async () => {
    const res = await fetch(`${BACKEND_URL}/api/chats?username=${username}`);
    const data = await res.json();
    if (res.ok) {
      const sorted = [...data].sort((a,b)=> new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0));
      setChats(sorted);
    }
  };

  const openChat = async (chat) => {
    setActiveChat(chat);
    socket.emit('join', chat._id);
    const res = await fetch(`${BACKEND_URL}/api/chats/${chat._id}/messages`);
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

    const res = await fetch(`${BACKEND_URL}/api/chats/${activeChat._id}/messages`, {
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
      await fetch(`${BACKEND_URL}/api/messages/${messageId}`, {
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
      await fetch(`${BACKEND_URL}/api/messages/${messageId}`, {
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
    <div className="chat-container feature-card" style={{ display: 'flex', height: '80vh', width: '95%', margin: '20px auto', overflow: 'hidden', padding: 0, flexDirection: isMobile ? 'column' : 'row' }}>
      {(!isMobile || !activeChat) && (
      <div className="chat-sidebar" style={{ width: isMobile ? '100%' : '300px', borderRight: isMobile ? 'none' : '1px solid var(--border)', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-card)', height: isMobile ? '100%' : 'auto' }}>
        <div className="chat-search" style={{ padding: '15px', borderBottom: '1px solid var(--border)' }}>
          <input className="input" placeholder={t('search_jobs')} value={search} onChange={e => setSearch(e.target.value)} style={{ borderRadius: 'var(--radius-full)' }} />
        </div>
        <ul className="chat-list" style={{ listStyle: 'none', padding: 0, margin: 0, overflowY: 'auto', flex: 1 }}>
          {filtered.map(c => {
            const other = c.participants?.find(p => p.username !== username)?.username || t('unknown_user');
            const time = c.lastMessageAt ? new Date(c.lastMessageAt).toLocaleTimeString() : '';
            return (
              <li key={c._id} className={`chat-item ${activeChat?._id === c._id ? 'active' : ''}`} onClick={() => openChat(c)} style={{ display: 'flex', alignItems: 'center', padding: '15px', cursor: 'pointer', borderBottom: '1px solid var(--border)', backgroundColor: activeChat?._id === c._id ? 'rgba(99, 102, 241, 0.1)' : 'transparent', transition: 'var(--transition)' }}>
                <div className="avatar" style={{ width: '45px', height: '45px', borderRadius: '50%', background: 'var(--gradient-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', marginRight: '15px', flexShrink: 0 }}>{other[0]?.toUpperCase() || 'U'}</div>
                <div className="chat-meta" style={{ overflow: 'hidden', flex: 1 }}>
                  <span className="chat-name" style={{ fontWeight: 600, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-primary)' }}>{other} {time && <small style={{ marginLeft: '6px', color: 'var(--text-muted)', fontWeight: 'normal' }}>{time}</small>}</span>
                  <span className="chat-sub" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>{c.job?.title}</span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
      )}
      {(!isMobile || activeChat) && ( /* Main chat window */
      <div className="chat-main" style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-deep)', height: isMobile ? '100%' : 'auto' }}>
        {activeChat ? (
          <>
            <div className="chat-header" style={{ padding: '15px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', backgroundColor: 'var(--bg-card)', zIndex: 10 }}>
              {isMobile && <button onClick={() => setActiveChat(null)} style={{ marginRight: 10, background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', padding: '0 5px', color: 'white' }}>←</button>}
              <div className="avatar" style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--gradient-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', marginRight: '15px' }}>{(activeChat.participants?.find(p => p.username !== username)?.username || 'U')[0]?.toUpperCase() || 'U'}</div>
              <div>
                <div className="chat-title" style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{activeChat.participants?.find(p => p.username !== username)?.username || t('unknown_user')}</div>
                <div className="chat-subtitle" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{isTyping ? t('typing') : (activeChat.job?.title || '')}</div>
              </div>
            </div>
            <div className="chat-body" ref={bodyRef} style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '15px', background: 'var(--bg-deep)' }}>
              {messages.map(m => {
                const isOwn = m.sender?.username === username;
                return (
                  <div key={m._id} className={`msg ${isOwn ? 'me' : 'them'}`} style={{ display: 'flex', flexDirection: 'column', alignItems: isOwn ? 'flex-end' : 'flex-start', maxWidth: '70%', alignSelf: isOwn ? 'flex-end' : 'flex-start' }}>
                    <div style={{ padding: '12px 16px', borderRadius: '12px', position: 'relative', wordWrap: 'break-word', backgroundColor: isOwn ? 'var(--primary)' : 'var(--bg-card)', color: 'white', border: '1px solid var(--border)', borderBottomRightRadius: isOwn ? '2px' : '12px', borderBottomLeftRadius: isOwn ? '12px' : '2px', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
                    {editingMessageId === m._id ? (
                      <div style={{ minWidth: '200px' }}>
                        <textarea 
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="textarea" style={{ padding: '5px', borderRadius: '4px', background: 'rgba(0,0,0,0.2)' }}
                          autoFocus
                        />
                        <div style={{ textAlign: 'right', marginTop: '5px', display: 'flex', gap: '5px', justifyContent: 'flex-end' }}>
                          <button onClick={() => handleSaveEdit(m._id)} className="btn-primary" style={{ padding: '4px 8px', fontSize: '0.8rem' }}>{t('save')}</button>
                          <button onClick={() => setEditingMessageId(null)} className="btn-secondary" style={{ padding: '4px 8px', fontSize: '0.8rem', backgroundColor: '#dc3545', borderColor: '#dc3545' }}>{t('cancel')}</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div style={{ fontSize: '0.95rem', lineHeight: 1.4 }}>
                          {m.content}
                          {m.fileUrl && (
                            <div style={{ marginTop: '5px', background: 'rgba(0,0,0,0.2)', padding: '5px', borderRadius: '4px' }}>
                                <a href={m.fileUrl.startsWith('http') ? m.fileUrl : `${BACKEND_URL}${m.fileUrl.startsWith('/') ? '' : '/'}${m.fileUrl}`} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>📄 {m.fileName || 'Attachment'}</a>
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
                    {isOwn && editingMessageId !== m._id && ( /* Message actions */
                        <div className="message-actions" style={{ display: 'flex', gap: '5px', marginTop: '2px', opacity: 0.8 }}>
                        <button onClick={() => handleEditClick(m)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem', padding: '2px', color: 'var(--text-secondary)' }} title="Edit">✏️</button>
                        <button onClick={() => handleDelete(m._id)} style={{ background: 'none', border: 'none', 'border': 'none', cursor: 'pointer', fontSize: '0.9rem', padding: '2px', color: 'var(--text-secondary)' }} title="Delete">🗑️</button>
                        </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="chat-input" style={{ padding: '15px 20px', backgroundColor: 'var(--bg-card)', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'flex-end', gap: '10px' }}>
              <button type="button" className="attach-btn btn-secondary" onClick={() => fileInputRef.current.click()} title="Attach File" style={{ padding: 0, width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>📎</button>
              <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={(e) => setFile(e.target.files[0])} />
              <div className="input-wrapper" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {file && (
                  <div className="file-preview" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', background: 'rgba(0,0,0,0.3)', padding: '5px 10px', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
                  className="textarea" style={{ borderRadius: 'var(--radius-xl)', background: 'rgba(0,0,0,0.2)', height: '45px', minHeight: '45px', maxHeight: '120px' }}
                />
              </div>
              <button className="send-btn btn-primary" onClick={sendMessage} style={{ padding: '0 20px', height: '40px', borderRadius: 'var(--radius-full)' }}>{t('send')}</button>
            </div>
          </>
        ) : (
          <div className="chat-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--text-muted)', fontSize: '1.2rem' }}>{t('select_chat_to_start')}</div>
        )}
      </div>
      )}
    </div>
  );
}

export default Chats;