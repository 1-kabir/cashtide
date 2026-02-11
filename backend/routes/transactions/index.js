const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeWalletAccess } = require('../../middleware/auth');
const transactionController = require('../../controllers/transactionController');

// GET /api/wallets/:id/transactions - List transactions for a wallet
router.get('/', authenticateToken, authorizeWalletAccess, transactionController.getWalletTransactions);

// POST /api/wallets/:id/transactions - Create transaction
router.post('/', authenticateToken, authorizeWalletAccess, transactionController.createTransaction);

// GET /api/transactions/:transactionId - Get transaction details
router.get('/:transactionId', authenticateToken, transactionController.getTransactionById);

// PUT /api/transactions/:transactionId - Update transaction
router.put('/:transactionId', authenticateToken, transactionController.updateTransaction);

// DELETE /api/transactions/:transactionId - Delete transaction
router.delete('/:transactionId', authenticateToken, transactionController.deleteTransaction);

module.exports = router;