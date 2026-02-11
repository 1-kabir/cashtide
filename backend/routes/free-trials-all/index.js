const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const freeTrialController = require('../controllers/freeTrialController');

// PUT /api/free-trials/:freeTrialId - Update free trial status
router.put('/:freeTrialId', authenticateToken, freeTrialController.updateFreeTrial);

// DELETE /api/free-trials/:freeTrialId - Delete free trial
router.delete('/:freeTrialId', authenticateToken, freeTrialController.deleteFreeTrial);

module.exports = router;