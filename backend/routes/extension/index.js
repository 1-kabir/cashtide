const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/auth');
const { aiExtensionRateLimiter } = require('../../middleware/rate-limiters');
const { 
  processExtensionCapture,
  getExtensionStatus,
  confirmExtensionExtraction
} = require('../../controllers/extensionController');

// POST /api/ai/extension/capture - Process captured page content
router.post('/capture', authenticateToken, aiExtensionRateLimiter(), processExtensionCapture);

// GET /api/ai/extension/status/:extractionId - Get processing status
router.get('/status/:extractionId', authenticateToken, getExtensionStatus);

// POST /api/ai/extension/confirm/:extractionId - Confirm extracted transactions
router.post('/confirm/:extractionId', authenticateToken, confirmExtensionExtraction);

module.exports = router;