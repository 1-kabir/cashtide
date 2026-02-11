const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeWalletAccess } = require('../../middleware/auth');
const sharedWalletController = require('../../controllers/sharedWalletController');

// POST /api/wallets/:id/share - Share wallet with another user
router.post('/:id/share', authenticateToken, authorizeWalletAccess, sharedWalletController.shareWallet);

// PUT /api/shared-wallets/:sharedWalletId - Update shared wallet permissions
router.put('/:sharedWalletId', authenticateToken, sharedWalletController.updateSharedWallet);

// PUT /api/shared-wallets/:sharedWalletId/respond - Accept or decline invitation
router.put('/:sharedWalletId/respond', authenticateToken, sharedWalletController.respondToInvitation);

// DELETE /api/shared-wallets/:sharedWalletId - Remove shared wallet access
router.delete('/:sharedWalletId', authenticateToken, sharedWalletController.removeSharedWallet);

// GET /api/shared-wallets/invitations - Get pending invitations for current user
router.get('/invitations', authenticateToken, sharedWalletController.getPendingInvitations);

module.exports = router;