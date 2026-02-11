const { BufferMemory } = require("langchain/memory");
const { ChatMessageHistory } = require("@langchain/core/chat_history");
const { InMemoryChatMessageHistory } = require("@langchain/core/chat_memory");

// In-memory storage for chat histories (in production, use Redis, DB, etc.)
const memoryStore = new Map();

// Create a memory instance for a specific user
const createUserMemory = (userId) => {
  const sessionId = `chat-${userId}`;
  
  if (!memoryStore.has(sessionId)) {
    memoryStore.set(
      sessionId,
      new InMemoryChatMessageHistory()
    );
  }
  
  return new BufferMemory({
    chatHistory: memoryStore.get(sessionId),
    memoryKey: "history",
    inputKey: "input",
    outputKey: "response"
  });
};

// Get conversation history for a user
const getUserConversationHistory = async (userId) => {
  const sessionId = `chat-${userId}`;
  if (!memoryStore.has(sessionId)) {
    return [];
  }
  
  const history = memoryStore.get(sessionId);
  const messages = await history.getMessages();
  
  return messages.map(msg => ({
    type: msg._getType(),
    content: msg.content,
    timestamp: new Date().toISOString()
  }));
};

// Clear conversation history for a user
const clearUserConversationHistory = (userId) => {
  const sessionId = `chat-${userId}`;
  if (memoryStore.has(sessionId)) {
    memoryStore.delete(sessionId);
    return true;
  }
  return false;
};

// Save a message to a user's conversation history
const saveMessageToHistory = async (userId, message, isUserMessage = true) => {
  const sessionId = `chat-${userId}`;
  
  if (!memoryStore.has(sessionId)) {
    memoryStore.set(
      sessionId,
      new InMemoryChatMessageHistory()
    );
  }
  
  const history = memoryStore.get(sessionId);
  
  if (isUserMessage) {
    await history.addUserMessage(message);
  } else {
    await history.addAIChatMessage(message);
  }
};

// Get the buffer memory instance for a user
const getBufferMemory = (userId) => {
  const sessionId = `chat-${userId}`;
  
  if (!memoryStore.has(sessionId)) {
    memoryStore.set(
      sessionId,
      new InMemoryChatMessageHistory()
    );
  }
  
  return memoryStore.get(sessionId);
};

module.exports = {
  createUserMemory,
  getUserConversationHistory,
  clearUserConversationHistory,
  saveMessageToHistory,
  getBufferMemory
};