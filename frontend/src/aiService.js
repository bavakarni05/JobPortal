const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// A simple in-memory history for each user's conversation with the AI
const conversationHistories = {};

async function getAICoachResponse(userMessage, userId) {
  if (!conversationHistories[userId]) {
    conversationHistories[userId] = [
      {
        role: 'system',
        content: 'You are an expert career coach for a job portal focused on empowering women. Your name is "AI Coach". Keep your responses helpful, encouraging, and concise. You can provide resume tips, interview advice, and guidance on finding jobs.'
      },
    ];
  }

  conversationHistories[userId].push({ role: 'user', content: userMessage });

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: conversationHistories[userId],
    });

    const aiResponse = completion.choices[0].message.content;
    conversationHistories[userId].push({ role: 'assistant', content: aiResponse });

    // Optional: Trim history to prevent it from growing too large
    if (conversationHistories[userId].length > 10) {
      conversationHistories[userId].splice(1, conversationHistories[userId].length - 10);
    }

    return aiResponse;
  } catch (error) {
    console.error('Error calling OpenAI:', error);
    return 'I am having trouble connecting to my brain right now. Please try again in a moment.';
  }
}

module.exports = { getAICoachResponse };