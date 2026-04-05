// Member Model - Database operations for members
const pool = require('../config/database');

class Member {
    // Get all members with pagination, search, and filtering
    static async getAll(page = 1, limit = 10, search = '', status = '') {
        const offset = (page - 1) * limit;
        let query = 'SELECT * FROM members WHERE 1=1';
        const params = [];

        // Add search filters
        if (search) {
            query += ' AND (name LIKE ? OR card_id LIKE ? OR email LIKE ?)';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        // Add status filter
        if (status) {
            query += ' AND status = ?';
            params.push(status);
        }

        // Add pagination
        query += ' ORDER BY card_id ASC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const [members] = await pool.query(query, params);

        // Get total count for pagination
        let countQuery = 'SELECT COUNT(*) as total FROM members WHERE 1=1';
        const countParams = [];

        if (search) {
            countQuery += ' AND (name LIKE ? OR card_id LIKE ? OR email LIKE ?)';
            countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        if (status) {
            countQuery += ' AND status = ?';
            countParams.push(status);
        }

        const [countResult] = await pool.query(countQuery, countParams);
        const total = countResult[0].total;

        return {
            members,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    }

    // Get single member by card ID with current borrowing info
    static async getById(cardId) {
        const [members] = await pool.query(
            'SELECT * FROM members WHERE card_id = ?',
            [cardId]
        );

        if (!members[0]) return null;

        const member = members[0];

        // Get current borrowings
        const [borrowings] = await pool.query(
            'SELECT t.transaction_id, t.book_id, b.title, b.author, t.issue_date, t.due_date, t.status FROM transactions t JOIN books b ON t.book_id = b.book_id WHERE t.member_card_id = ? AND t.status IN ("issued", "overdue") ORDER BY t.due_date ASC',
            [cardId]
        );

        member.current_borrowings = borrowings;

        // Get unpaid fines
        const [fines] = await pool.query(
            'SELECT * FROM fines WHERE member_card_id = ? AND paid = FALSE ORDER BY created_at DESC',
            [cardId]
        );

        member.unpaid_fines = fines;

        return member;
    }

    // Create a new member
    static async create(memberData) {
        const { card_id, name, email, phone, address, membership_type, status } = memberData;

        const maxBooksAllowed = this.getMaxBooksForMembership(membership_type);

        const [result] = await pool.query(
            'INSERT INTO members (card_id, name, email, phone, address, membership_type, max_books_allowed, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [card_id, name, email, phone || null, address || null, membership_type || 'Basic', maxBooksAllowed, status || 'active']
        );

        return result.insertId;
    }

    // Update member details
    static async update(cardId, memberData) {
        const { name, email, phone, address, membership_type, status } = memberData;

        const maxBooksAllowed = this.getMaxBooksForMembership(membership_type);

        const [result] = await pool.query(
            'UPDATE members SET name = ?, email = ?, phone = ?, address = ?, membership_type = ?, max_books_allowed = ?, status = ? WHERE card_id = ?',
            [name, email, phone || null, address || null, membership_type, maxBooksAllowed, status, cardId]
        );

        return result.affectedRows > 0;
    }

    // Delete a member
    static async delete(cardId) {
        // Check if member has active borrowings
        const [borrowings] = await pool.query(
            'SELECT * FROM transactions WHERE member_card_id = ? AND status IN ("issued", "overdue")',
            [cardId]
        );

        if (borrowings.length > 0) {
            throw new Error('Cannot delete member with active borrowings');
        }

        const [result] = await pool.query(
            'DELETE FROM members WHERE card_id = ?',
            [cardId]
        );

        return result.affectedRows > 0;
    }

    // Get member's borrowing history
    static async getHistory(cardId, page = 1, limit = 10) {
        const offset = (page - 1) * limit;

        const [transactions] = await pool.query(
            `SELECT t.transaction_id, t.book_id, b.title, b.author, t.issue_date, t.due_date, t.return_date, t.fine_amount, t.status
             FROM transactions t
             JOIN books b ON t.book_id = b.book_id
             WHERE t.member_card_id = ?
             ORDER BY t.issue_date DESC
             LIMIT ? OFFSET ?`,
            [cardId, limit, offset]
        );

        const [countResult] = await pool.query(
            'SELECT COUNT(*) as total FROM transactions WHERE member_card_id = ?',
            [cardId]
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

    // Get count of current borrowings for a member
    static async getCurrentBorrowingCount(cardId) {
        const [result] = await pool.query(
            'SELECT COUNT(*) as count FROM transactions WHERE member_card_id = ? AND status IN ("issued", "overdue")',
            [cardId]
        );
        return result[0].count;
    }

    // Check if member exists
    static async exists(cardId) {
        const [result] = await pool.query('SELECT id FROM members WHERE card_id = ?', [cardId]);
        return result.length > 0;
    }

    // Get max books allowed for membership type
    static getMaxBooksForMembership(type) {
        const limits = {
            'Basic': 5,
            'Premium': 10,
            'Student': 3
        };
        return limits[type] || 5;
    }

    // Check if email already exists (for uniqueness validation)
    static async emailExists(email, excludeCardId = null) {
        let query = 'SELECT id FROM members WHERE email = ?';
        let params = [email];

        if (excludeCardId) {
            query += ' AND card_id != ?';
            params.push(excludeCardId);
        }

        const [result] = await pool.query(query, params);
        return result.length > 0;
    }
}

module.exports = Member;
