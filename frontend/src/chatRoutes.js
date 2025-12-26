// This is an example file. You should integrate this logic into your existing chat routes.

const express = require('express');
const router = express.Router();
const Chat = require('../models/Chat'); // Assuming this model exists
const Message = require('../models/Message'); // Assuming this model exists
const User = require('../models/User'); // Assuming this model exists
const { getAICoachResponse } = require('../services/aiService');

const AI_BOT_NAME = 'AI_Coach';

// Note: This assumes you have a way to access your socket.io instance.
// A common pattern is to attach it to the app object in your main server file:
// app.set('io', io);

/**
 * POST /api/chats/:id/messages
 * This is the route that needs to be updated.
 */
router.post('/:id/messages', async (req, res) => {
  const { id: chatId } = req.params;
  // Note: The frontend sends FormData, so we need a middleware like 'multer' for text fields and files.
  // For simplicity, I'll assume you have a middleware that puts text fields into `req.body`.
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

    // --- Start of AI Logic ---
    const isAIChat = chat.participants.some(p => p.username === AI_BOT_NAME);

    if (isAIChat) {
      // 1. Save and emit the user's message
      const userMessage = new Message({ chat: chatId, sender: sender._id, content });
      await userMessage.save();
      await userMessage.populate('sender', 'username');
      io.to(chatId).emit('newMessage', userMessage);

      // 2. Get AI response (this can take a few seconds)
      const aiResponseContent = await getAICoachResponse(content, username);

      // 3. Save and emit the AI's message
      const aiUser = await User.findOne({ username: AI_BOT_NAME });
      if (!aiUser) {
        console.error('AI_Coach user not found in the database!');
        // We don't send a response here because the user's message was already sent.
        // The AI can just fail to reply.
        return res.status(200).json({ message: 'Message sent.' });
      }

      const aiMessage = new Message({ chat: chatId, sender: aiUser._id, content: aiResponseContent });
      await aiMessage.save();
      await aiMessage.populate('sender', 'username');
      io.to(chatId).emit('newMessage', aiMessage);

      // 4. Update chat timestamp and respond to the HTTP request
      chat.lastMessageAt = new Date();
      await chat.save();

      return res.status(200).json({ message: 'Message processed by AI.' });

    } else {
      // --- Your existing logic for user-to-user chat ---
      // This part should already handle file uploads if you have them.
      const newMessage = new Message({
        chat: chatId,
        sender: sender._id,
        content: content,
        // fileUrl: req.file ? req.file.path : null, // Example for file handling
      });
      await newMessage.save();
      
      chat.lastMessageAt = new Date();
      await chat.save();

      await newMessage.populate('sender', 'username');
      io.to(chatId).emit('newMessage', newMessage);

      res.status(201).json({ data: newMessage });
    }
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;