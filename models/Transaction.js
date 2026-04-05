// Transaction Model - Database operations for book transactions
const pool = require('../config/database');

class Transaction {
    // Generate unique transaction ID
    static generateTransactionId() {
        return 'TXN' + Date.now() + Math.random().toString(36).substr(2, 9).toUpperCase();
    }

    // Get all transactions with filters
    static async getAll(page = 1, limit = 10, status = '', memberId = '', bookId = '') {
        const offset = (page - 1) * limit;
        let query = 'SELECT t.*, b.title, b.author, m.name as member_name FROM transactions t JOIN books b ON t.book_id = b.book_id JOIN members m ON t.member_card_id = m.card_id WHERE 1=1';
        const params = [];

        // Add status filter
        if (status) {
            query += ' AND t.status = ?';
            params.push(status);
        }

        // Add member filter
        if (memberId) {
            query += ' AND t.member_card_id = ?';
            params.push(memberId);
        }

        // Add book filter
        if (bookId) {
            query += ' AND t.book_id = ?';
            params.push(bookId);
        }

        // Add pagination
        query += ' ORDER BY t.issue_date DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const [transactions] = await pool.query(query, params);

        // Get total count
        let countQuery = 'SELECT COUNT(*) as total FROM transactions WHERE 1=1';
        const countParams = [];

        if (status) {
            countQuery += ' AND status = ?';
            countParams.push(status);
        }
        if (memberId) {
            countQuery += ' AND member_card_id = ?';
            countParams.push(memberId);
        }
        if (bookId) {
            countQuery += ' AND book_id = ?';
            countParams.push(bookId);
        }

        const [countResult] = await pool.query(countQuery, countParams);
        const total = countResult[0].total;

        return {
            transactions,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    }

    // Issue a book to member
    static async issueBook(bookId, memberCardId) {
        const connection = await pool.getConnection();

        try {
            await connection.beginTransaction();

            // Verify book exists and has available copies
            const [books] = await connection.query('SELECT * FROM books WHERE book_id = ?', [bookId]);
            if (!books[0]) throw new Error('Book not found');
            if (books[0].available_copies <= 0) throw new Error('Book not available');

            // Verify member exists and is active
            const [members] = await connection.query('SELECT * FROM members WHERE card_id = ?', [memberCardId]);
            if (!members[0]) throw new Error('Member not found');
            if (members[0].status !== 'active') throw new Error('Member is not active');

            // Check borrowing limit
            const [borrowings] = await connection.query(
                'SELECT COUNT(*) as count FROM transactions WHERE member_card_id = ? AND status IN ("issued", "overdue")',
                [memberCardId]
            );

            if (borrowings[0].count >= members[0].max_books_allowed) {
                throw new Error(`Member has reached borrowing limit of ${members[0].max_books_allowed} books`);
            }

            // Check if member has unpaid fines
            const [fines] = await connection.query(
                'SELECT SUM(amount) as total_fine FROM fines WHERE member_card_id = ? AND paid = FALSE',
                [memberCardId]
            );

            if (fines[0].total_fine > 0) {
                throw new Error(`Member has unpaid fines of ₹${fines[0].total_fine}`);
            }

            // Create transaction
            const transactionId = this.generateTransactionId();
            const issueDate = new Date().toISOString().split('T')[0];
            const dueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

            await connection.query(
                'INSERT INTO transactions (transaction_id, book_id, member_card_id, issue_date, due_date, status) VALUES (?, ?, ?, ?, ?, "issued")',
                [transactionId, bookId, memberCardId, issueDate, dueDate]
            );

            await connection.commit();
            return { success: true, transactionId, dueDate };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    // Return a book and calculate fines if overdue
    static async returnBook(transactionId) {
        const connection = await pool.getConnection();

        try {
            await connection.beginTransaction();

            // Get transaction details
            const [transactions] = await connection.query('SELECT * FROM transactions WHERE transaction_id = ?', [transactionId]);
            if (!transactions[0]) throw new Error('Transaction not found');

            const transaction = transactions[0];
            if (transaction.status === 'returned') throw new Error('Book already returned');

            const returnDate = new Date().toISOString().split('T')[0];
            const dueDate = new Date(transaction.due_date);
            const returnDateObj = new Date(returnDate);

            let fineAmount = 0;
            if (returnDateObj > dueDate) {
                const daysOverdue = Math.floor((returnDateObj - dueDate) / (1000 * 60 * 60 * 24));
                fineAmount = daysOverdue * 5; // ₹5 per day fine
            }

            // Update transaction
            await connection.query(
                'UPDATE transactions SET return_date = ?, fine_amount = ?, status = ? WHERE transaction_id = ?',
                [returnDate, fineAmount, 'returned', transactionId]
            );

            // Create fine record if applicable
            if (fineAmount > 0) {
                const daysOverdue = Math.floor((returnDateObj - dueDate) / (1000 * 60 * 60 * 24));
                await connection.query(
                    'INSERT INTO fines (transaction_id, member_card_id, amount, days_overdue, paid) VALUES (?, ?, ?, ?, FALSE)',
                    [transactionId, transaction.member_card_id, fineAmount, daysOverdue]
                );
            }

            await connection.commit();
            return { success: true, fineAmount, returnDate };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    // Get all overdue books
    static async getOverdue(page = 1, limit = 10) {
        const offset = (page - 1) * limit;

        const [transactions] = await pool.query(
            `SELECT t.*, b.title, b.author, m.name as member_name, (DATEDIFF(CURDATE(), t.due_date) * 5) as calculated_fine
             FROM transactions t
             JOIN books b ON t.book_id = b.book_id
             JOIN members m ON t.member_card_id = m.card_id
             WHERE t.status IN ('issued', 'overdue') AND t.due_date < CURDATE()
             ORDER BY t.due_date ASC
             LIMIT ? OFFSET ?`,
            [limit, offset]
        );

        const [countResult] = await pool.query(
            'SELECT COUNT(*) as total FROM transactions WHERE status IN ("issued", "overdue") AND due_date < CURDATE()'
        );

        const total = countResult[0].total;

        return {
            transactions,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    }

    // Pay a fine
    static async payFine(fineId) {
        const paidDate = new Date().toISOString().split('T')[0];

        const [result] = await pool.query(
            'UPDATE fines SET paid = TRUE, paid_date = ? WHERE id = ?',
            [paidDate, fineId]
        );

        return result.affectedRows > 0;
    }

    // Get all fines for a member
    static async getMemberFines(memberCardId) {
        const [fines] = await pool.query(
            `SELECT f.*, t.transaction_id, t.book_id, b.title FROM fines f
             JOIN transactions t ON f.transaction_id = t.transaction_id
             JOIN books b ON t.book_id = b.book_id
             WHERE f.member_card_id = ?
             ORDER BY f.created_at DESC`,
            [memberCardId]
        );

        return fines;
    }

    // Get transaction by ID
    static async getById(transactionId) {
        const [transactions] = await pool.query(
            'SELECT * FROM transactions WHERE transaction_id = ?',
            [transactionId]
        );
        return transactions[0] || null;
    }

    // Calculate overdue status
    static async updateOverdueStatus() {
        const [result] = await pool.query(
            'UPDATE transactions SET status = "overdue" WHERE status = "issued" AND due_date < CURDATE()'
        );
        return result.affectedRows;
    }
}

module.exports = Transaction;
