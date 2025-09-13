import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const socket = io();

function Chats({ initialChatId }) {
  const username = localStorage.getItem('username');
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');

  useEffect(() => {
    fetchChats();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (!initialChatId || chats.length === 0) return;
    const chat = chats.find(c => c._id === initialChatId);
    if (chat) {
      openChat(chat);
    }
    // eslint-disable-next-line
  }, [initialChatId, chats]);

  useEffect(() => {
    socket.on('newMessage', (msg) => {
      setMessages(prev => {
        if (!activeChat || msg.chat !== activeChat._id) return prev;
        return [...prev, msg];
      });
    });
    return () => {
      socket.off('newMessage');
    };
  }, [activeChat]);

  const fetchChats = async () => {
    const res = await fetch(`/api/chats?username=${username}`);
    const data = await res.json();
    if (res.ok) setChats(data);
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

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16, width: '100%', maxWidth: 900, margin: '24px auto' }}>
      <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 2px 10px rgba(0,0,0,0.05)', padding: 12 }}>
        <h4>Your Chats</h4>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {chats.map(c => (
            <li key={c._id} onClick={() => openChat(c)} style={{ padding: '10px 8px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', fontWeight: activeChat?._id === c._id ? 700 : 500 }}>
              <div style={{ fontWeight: 600, fontSize: '14px' }}>{c.job?.title}</div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                {c.participants?.find(p => p.username !== username)?.username || 'Unknown User'}
              </div>
            </li>
          ))}
        </ul>
      </div>
      <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 2px 10px rgba(0,0,0,0.05)', padding: 12, minHeight: 360 }}>
        {activeChat ? (
          <>
            <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: 8, marginBottom: 8 }}>
              <b>{activeChat.job?.title}</b>
              <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>
                Chat with: {activeChat.participants?.find(p => p.username !== username)?.username || 'Unknown User'}
              </div>
            </div>
            <div style={{ height: 280, overflowY: 'auto', paddingRight: 4 }}>
              {messages.map(m => (
                <div key={m._id} style={{ margin: '8px 0', textAlign: m.sender?.username === username ? 'right' : 'left' }}>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px', textAlign: m.sender?.username === username ? 'right' : 'left' }}>
                    {m.sender?.username}
                  </div>
                  <div style={{ display: 'inline-block', background: m.sender?.username === username ? '#e75480' : '#f3f4f6', color: m.sender?.username === username ? '#fff' : '#111827', padding: '8px 12px', borderRadius: 12 }}>
                    {m.content}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <input className="input" value={text} onChange={e => setText(e.target.value)} placeholder="Type a message..." />
              <button className="btn-primary" onClick={sendMessage}>Send</button>
            </div>
          </>
        ) : (
          <div style={{ color: '#6b7280' }}>Select a chat to start messaging</div>
        )}
      </div>
    </div>
  );
}

export default Chats;