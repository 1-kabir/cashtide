const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/auth');
const { aiAssistantRateLimiter } = require('../../middleware/rate-limiters');
const { 
  aiAssistant, 
  getAiAssistantHistory, 
  clearAiAssistantHistory 
} = require('../../controllers/aiController');

// POST /api/ai/assistant - Send message to AI assistant
router.post('/assistant', authenticateToken, aiAssistantRateLimiter(), aiAssistant);

// GET /api/ai/assistant/history - Get conversation history
router.get('/assistant/history', authenticateToken, getAiAssistantHistory);

// DELETE /api/ai/assistant/history - Clear conversation history
router.delete('/assistant/history', authenticateToken, clearAiAssistantHistory);

module.exports = router;