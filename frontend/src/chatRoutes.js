const express = require('express');
const router = express.Router();
const Chat = require('../models/Chat'); // Ensure you have this model
const Message = require('../models/Message'); // Ensure you have this model
const User = require('../models/User'); // Ensure you have this model
// Note: This assumes you have a way to access your socket.io instance.
// A common pattern is to attach it to the app object in your main server file:
// app.set('io', io);

/**
 * POST /api/chats/:id/messages
 * Send a message to a chat. Handles AI responses if the recipient is AI_Coach.
 */
router.post('/:id/messages', async (req, res) => {
  const { id: chatId } = req.params;
  // Note: If using FormData on frontend, ensure you have 'multer' or similar middleware configured in your server.js 
  // to parse multipart/form-data, otherwise req.body might be empty.
  const { username, content } = req.body;

  try {
    const chat = await Chat.findById(chatId).populate('participants', 'username');
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    const sender = await User.findOne({ username });
    if (!sender) {
      return res.status(404).json({ message: 'Sender not found' });
    }

    const io = req.app.get('io');

    // --- Normal user-to-user chat ---
    const newMessage = new Message({
      chat: chatId,
      sender: sender._id,
      content: content,
      // fileUrl: req.file ? req.file.path : null, 
    });
    await newMessage.save();
    
    chat.lastMessageAt = new Date();
    await chat.save();

    await newMessage.populate('sender', 'username');
    if (io) io.to(chatId).emit('newMessage', newMessage);

    res.status(201).json({ data: newMessage });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * POST /api/chats
 * Create or retrieve a chat between the current user and a recipient.
 */
router.post('/', async (req, res) => {
  const { username, recipient } = req.body;

  try {
    const currentUser = await User.findOne({ username });
    if (!currentUser) return res.status(404).json({ error: 'User not found' });

    let targetUser = await User.findOne({ username: recipient });
    if (!targetUser) return res.status(404).json({ error: 'Recipient not found' });

    let chat = await Chat.findOne({
      participants: { $all: [currentUser._id, targetUser._id] }
    }).populate('participants', 'username');

    if (!chat) {
      chat = new Chat({
        participants: [currentUser._id, targetUser._id],
        lastMessageAt: new Date()
      });
      await chat.save();
      await chat.populate('participants', 'username');
    }

    res.json(chat);
  } catch (err) {
    console.error("Error creating chat:", err);
    res.status(500).json({ error: 'Failed to create chat' });
  }
});

module.exports = router;