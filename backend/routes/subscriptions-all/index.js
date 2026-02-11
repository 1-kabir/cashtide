const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const subscriptionController = require('../controllers/subscriptionController');

// PUT /api/subscriptions/:subscriptionId - Update subscription status
router.put('/:subscriptionId', authenticateToken, subscriptionController.updateSubscription);

// DELETE /api/subscriptions/:subscriptionId - Delete subscription
router.delete('/:subscriptionId', authenticateToken, subscriptionController.deleteSubscription);

module.exports = router;