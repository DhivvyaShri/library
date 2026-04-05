// Dashboard Routes - REST API endpoints for dashboard data
const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const Transaction = require('../models/Transaction');

// GET /api/dashboard/stats - Get dashboard statistics
router.get('/stats', async (req, res) => {
    try {
        // Get stats from view
        const [stats] = await pool.query('SELECT * FROM dashboard_stats');
        const dashboardStats = stats[0] || {};

        // Get recent transactions (last 10)
        const [recentTransactions] = await pool.query(
            `SELECT t.transaction_id, t.book_id, t.member_card_id, b.title, m.name as member_name, t.status, t.issue_date, t.due_date
             FROM transactions t
             JOIN books b ON t.book_id = b.book_id
             JOIN members m ON t.member_card_id = m.card_id
             ORDER BY t.issue_date DESC
             LIMIT 10`
        );

        // Get popular books (most borrowed)
        const [popularBooks] = await pool.query(
            `SELECT b.book_id, b.title, b.author, COUNT(t.id) as borrow_count
             FROM books b
             LEFT JOIN transactions t ON b.book_id = t.book_id
             GROUP BY b.book_id, b.title, b.author
             ORDER BY borrow_count DESC
             LIMIT 5`
        );

        res.json({
            success: true,
            data: {
                stats: dashboardStats,
                recent_transactions: recentTransactions,
                popular_books: popularBooks
            }
        });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch dashboard statistics' });
    }
});

// POST /api/dashboard/calculate-overdue - Manually trigger overdue calculation
router.post('/calculate-overdue', async (req, res) => {
    try {
        // Call stored procedure
        await pool.query('CALL CalculateOverdueFines()');

        // Get updated overdue count
        const [result] = await pool.query('SELECT COUNT(*) as overdue_count FROM transactions WHERE status = "overdue"');
        const overdueCount = result[0].overdue_count;

        res.json({
            success: true,
            message: 'Overdue fines calculated successfully',
            data: { overdue_books: overdueCount }
        });
    } catch (error) {
        console.error('Error calculating overdue fines:', error);
        res.status(500).json({ success: false, error: 'Failed to calculate overdue fines' });
    }
});

module.exports = router;
