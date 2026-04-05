// Members Routes - REST API endpoints for member management
const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const router = express.Router();
const Member = require('../models/Member');

// Middleware to handle validation errors
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: 'Validation error', details: errors.array() });
    }
    next();
};

// GET /api/members - Get all members with pagination and filtering
router.get('/',
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('search').optional().isString().trim(),
    query('status').optional().isString().trim(),
    handleValidationErrors,
    async (req, res) => {
        try {
            const { page = 1, limit = 10, search = '', status = '' } = req.query;
            const result = await Member.getAll(page, limit, search, status);
            res.json({ success: true, data: result });
        } catch (error) {
            console.error('Error fetching members:', error);
            res.status(500).json({ success: false, error: 'Failed to fetch members' });
        }
    }
);

// GET /api/members/:cardId - Get member details with current borrowings
router.get('/:cardId',
    param('cardId').isString().trim(),
    handleValidationErrors,
    async (req, res) => {
        try {
            const { cardId } = req.params;
            const member = await Member.getById(cardId);

            if (!member) {
                return res.status(404).json({ success: false, error: 'Member not found' });
            }

            res.json({ success: true, data: member });
        } catch (error) {
            console.error('Error fetching member:', error);
            res.status(500).json({ success: false, error: 'Failed to fetch member' });
        }
    }
);

// GET /api/members/:cardId/history - Get member's borrowing history
router.get('/:cardId/history',
    param('cardId').isString().trim(),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    handleValidationErrors,
    async (req, res) => {
        try {
            const { cardId } = req.params;
            const { page = 1, limit = 10 } = req.query;

            // Check if member exists
            const member = await Member.getById(cardId);
            if (!member) {
                return res.status(404).json({ success: false, error: 'Member not found' });
            }

            const result = await Member.getHistory(cardId, page, limit);
            res.json({ success: true, data: result });
        } catch (error) {
            console.error('Error fetching member history:', error);
            res.status(500).json({ success: false, error: 'Failed to fetch member history' });
        }
    }
);

// POST /api/members - Create a new member
router.post('/',
    body('card_id').notEmpty().isString().trim().withMessage('Card ID is required'),
    body('name').notEmpty().isString().trim().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('phone').optional().isString().trim(),
    body('address').optional().isString().trim(),
    body('membership_type').optional().isIn(['Basic', 'Premium', 'Student']).withMessage('Invalid membership type'),
    body('status').optional().isIn(['active', 'suspended', 'expired']).withMessage('Invalid status'),
    handleValidationErrors,
    async (req, res) => {
        try {
            const { card_id, name, email, phone, address, membership_type, status } = req.body;

            // Check if member already exists
            const exists = await Member.exists(card_id);
            if (exists) {
                return res.status(409).json({ success: false, error: 'Member with this card ID already exists' });
            }

            // Check if email already exists
            const emailExists = await Member.emailExists(email);
            if (emailExists) {
                return res.status(409).json({ success: false, error: 'Email already registered' });
            }

            await Member.create({
                card_id,
                name,
                email,
                phone,
                address,
                membership_type,
                status
            });

            res.status(201).json({ success: true, message: 'Member created successfully' });
        } catch (error) {
            console.error('Error creating member:', error);
            res.status(500).json({ success: false, error: 'Failed to create member' });
        }
    }
);

// PUT /api/members/:cardId - Update member information
router.put('/:cardId',
    param('cardId').isString().trim(),
    body('name').optional().isString().trim(),
    body('email').optional().isEmail(),
    body('phone').optional().isString().trim(),
    body('address').optional().isString().trim(),
    body('membership_type').optional().isIn(['Basic', 'Premium', 'Student']),
    body('status').optional().isIn(['active', 'suspended', 'expired']),
    handleValidationErrors,
    async (req, res) => {
        try {
            const { cardId } = req.params;

            // Check if member exists
            const member = await Member.getById(cardId);
            if (!member) {
                return res.status(404).json({ success: false, error: 'Member not found' });
            }

            // Check if new email already exists (if being changed)
            if (req.body.email && req.body.email !== member.email) {
                const emailExists = await Member.emailExists(req.body.email, cardId);
                if (emailExists) {
                    return res.status(409).json({ success: false, error: 'Email already registered' });
                }
            }

            const { name, email, phone, address, membership_type, status } = req.body;

            await Member.update(cardId, {
                name: name || member.name,
                email: email || member.email,
                phone: phone || member.phone,
                address: address || member.address,
                membership_type: membership_type || member.membership_type,
                status: status || member.status
            });

            res.json({ success: true, message: 'Member updated successfully' });
        } catch (error) {
            console.error('Error updating member:', error);
            res.status(500).json({ success: false, error: 'Failed to update member' });
        }
    }
);

// DELETE /api/members/:cardId - Delete a member
router.delete('/:cardId',
    param('cardId').isString().trim(),
    handleValidationErrors,
    async (req, res) => {
        try {
            const { cardId } = req.params;

            // Check if member exists
            const member = await Member.getById(cardId);
            if (!member) {
                return res.status(404).json({ success: false, error: 'Member not found' });
            }

            await Member.delete(cardId);
            res.json({ success: true, message: 'Member deleted successfully' });
        } catch (error) {
            if (error.message.includes('active borrowings')) {
                return res.status(400).json({ success: false, error: error.message });
            }
            console.error('Error deleting member:', error);
            res.status(500).json({ success: false, error: 'Failed to delete member' });
        }
    }
);

module.exports = router;
