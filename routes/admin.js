// Admin Routes - Administrative utilities for the library system
const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// POST /api/admin/clear-all - Remove all library data from the database
router.post('/clear-all', async (req, res) => {
    try {
        await pool.query('SET FOREIGN_KEY_CHECKS = 0');
        await pool.query('TRUNCATE TABLE fines');
        await pool.query('TRUNCATE TABLE transactions');
        await pool.query('TRUNCATE TABLE members');
        await pool.query('TRUNCATE TABLE books');
        await pool.query('TRUNCATE TABLE categories');
        await pool.query('SET FOREIGN_KEY_CHECKS = 1');

        res.json({ success: true, message: 'All library data cleared successfully' });
    } catch (error) {
        console.error('Error clearing all data:', error);
        try {
            await pool.query('SET FOREIGN_KEY_CHECKS = 1');
        } catch (innerError) {
            console.error('Failed to re-enable foreign key checks:', innerError);
        }
        res.status(500).json({ success: false, error: 'Failed to clear all data' });
    }
});

module.exports = router;
