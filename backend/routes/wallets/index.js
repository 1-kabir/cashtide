const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeWalletAccess } = require('../../middleware/auth');
const walletController = require('../../controllers/walletController');

// GET /api/wallets - List all wallets for current user
router.get('/', authenticateToken, walletController.getUserWallets);

// POST /api/wallets - Create new wallet
router.post('/', authenticateToken, walletController.createWallet);

// GET /api/wallets/:id - Get wallet details
router.get('/:id', authenticateToken, authorizeWalletAccess, walletController.getWalletById);

// PUT /api/wallets/:id - Update wallet
router.put('/:id', authenticateToken, authorizeWalletAccess, walletController.updateWallet);

// DELETE /api/wallets/:id - Delete wallet
router.delete('/:id', authenticateToken, authorizeWalletAccess, walletController.deleteWallet);

module.exports = router;