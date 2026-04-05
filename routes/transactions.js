// Transactions Routes - REST API endpoints for transaction management
const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const router = express.Router();
const Transaction = require('../models/Transaction');

// Middleware to handle validation errors
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: 'Validation error', details: errors.array() });
    }
    next();
};

// GET /api/transactions - Get all transactions with filters
router.get('/',
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('status').optional().isString().trim(),
    query('memberId').optional().isString().trim(),
    query('bookId').optional().isString().trim(),
    handleValidationErrors,
    async (req, res) => {
        try {
            const { page = 1, limit = 10, status = '', memberId = '', bookId = '' } = req.query;
            const result = await Transaction.getAll(page, limit, status, memberId, bookId);
            res.json({ success: true, data: result });
        } catch (error) {
            console.error('Error fetching transactions:', error);
            res.status(500).json({ success: false, error: 'Failed to fetch transactions' });
        }
    }
);

// POST /api/transactions/issue - Issue a book to a member
router.post('/issue',
    body('book_id').notEmpty().isString().trim().withMessage('Book ID is required'),
    body('member_card_id').notEmpty().isString().trim().withMessage('Member card ID is required'),
    handleValidationErrors,
    async (req, res) => {
        try {
            const { book_id, member_card_id } = req.body;

            const result = await Transaction.issueBook(book_id, member_card_id);
            res.status(201).json({
                success: true,
                message: 'Book issued successfully',
                data: result
            });
        } catch (error) {
            console.error('Error issuing book:', error);

            if (error.message.includes('not found')) {
                return res.status(404).json({ success: false, error: error.message });
            }
            if (error.message.includes('not available') || error.message.includes('not active') || error.message.includes('limit') || error.message.includes('unpaid fines')) {
                return res.status(400).json({ success: false, error: error.message });
            }

            res.status(500).json({ success: false, error: 'Failed to issue book' });
        }
    }
);

// POST /api/transactions/return - Return a book
router.post('/return',
    body('transaction_id').notEmpty().isString().trim().withMessage('Transaction ID is required'),
    handleValidationErrors,
    async (req, res) => {
        try {
            const { transaction_id } = req.body;

            const result = await Transaction.returnBook(transaction_id);
            res.json({
                success: true,
                message: 'Book returned successfully',
                data: result
            });
        } catch (error) {
            console.error('Error returning book:', error);

            if (error.message.includes('not found')) {
                return res.status(404).json({ success: false, error: error.message });
            }
            if (error.message.includes('already returned')) {
                return res.status(400).json({ success: false, error: error.message });
            }

            res.status(500).json({ success: false, error: 'Failed to return book' });
        }
    }
);

// GET /api/transactions/overdue - Get all overdue books
router.get('/overdue',
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    handleValidationErrors,
    async (req, res) => {
        try {
            const { page = 1, limit = 10 } = req.query;
            const result = await Transaction.getOverdue(page, limit);
            res.json({ success: true, data: result });
        } catch (error) {
            console.error('Error fetching overdue transactions:', error);
            res.status(500).json({ success: false, error: 'Failed to fetch overdue transactions' });
        }
    }
);

// POST /api/transactions/pay-fine - Pay a fine
router.post('/pay-fine',
    body('fine_id').notEmpty().isInt().toInt().withMessage('Fine ID is required'),
    handleValidationErrors,
    async (req, res) => {
        try {
            const { fine_id } = req.body;

            const success = await Transaction.payFine(fine_id);

            if (!success) {
                return res.status(404).json({ success: false, error: 'Fine not found' });
            }

            res.json({ success: true, message: 'Fine paid successfully' });
        } catch (error) {
            console.error('Error paying fine:', error);
            res.status(500).json({ success: false, error: 'Failed to pay fine' });
        }
    }
);

// GET /api/transactions/fines/:memberCardId - Get all fines for a member
router.get('/fines/:memberCardId',
    param('memberCardId').isString().trim(),
    handleValidationErrors,
    async (req, res) => {
        try {
            const { memberCardId } = req.params;

            const fines = await Transaction.getMemberFines(memberCardId);
            res.json({ success: true, data: fines });
        } catch (error) {
            console.error('Error fetching member fines:', error);
            res.status(500).json({ success: false, error: 'Failed to fetch fines' });
        }
    }
);

module.exports = router;
