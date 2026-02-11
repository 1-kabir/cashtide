const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeWalletAccess } = require('../../middleware/auth');
const freeTrialController = require('../../controllers/freeTrialController');

// GET /api/wallets/:id/free-trials - List free trials for a wallet
router.get('/', authenticateToken, authorizeWalletAccess, freeTrialController.getWalletFreeTrials);

// POST /api/wallets/:id/free-trials - Create free trial
router.post('/', authenticateToken, authorizeWalletAccess, freeTrialController.createFreeTrial);

// PUT /api/free-trials/:freeTrialId - Update free trial status
router.put('/:freeTrialId', authenticateToken, freeTrialController.updateFreeTrial);

// DELETE /api/free-trials/:freeTrialId - Delete free trial
router.delete('/:freeTrialId', authenticateToken, freeTrialController.deleteFreeTrial);

module.exports = router;