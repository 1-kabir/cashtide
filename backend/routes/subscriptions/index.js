const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeWalletAccess } = require('../../middleware/auth');
const subscriptionController = require('../../controllers/subscriptionController');

// GET /api/wallets/:id/subscriptions - List subscriptions for a wallet
router.get('/', authenticateToken, authorizeWalletAccess, subscriptionController.getWalletSubscriptions);

// POST /api/wallets/:id/subscriptions - Create subscription
router.post('/', authenticateToken, authorizeWalletAccess, subscriptionController.createSubscription);

// PUT /api/subscriptions/:subscriptionId - Update subscription status
router.put('/:subscriptionId', authenticateToken, subscriptionController.updateSubscription);

// DELETE /api/subscriptions/:subscriptionId - Delete subscription
router.delete('/:subscriptionId', authenticateToken, subscriptionController.deleteSubscription);

module.exports = router;