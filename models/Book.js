// Book Model - Database operations for books
const pool = require('../config/database');

class Book {
    // Get all books with pagination, search, and filtering
    static async getAll(page = 1, limit = 10, search = '', category = '') {
        const offset = (page - 1) * limit;
        let query = 'SELECT * FROM books WHERE 1=1';
        const params = [];

        // Add search filters
        if (search) {
            query += ' AND (title LIKE ? OR author LIKE ? OR book_id LIKE ?)';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        // Add category filter
        if (category) {
            query += ' AND category = ?';
            params.push(category);
        }

        // Add pagination
        query += ' ORDER BY book_id ASC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const [books] = await pool.query(query, params);

        // Get total count for pagination
        let countQuery = 'SELECT COUNT(*) as total FROM books WHERE 1=1';
        const countParams = [];

        if (search) {
            countQuery += ' AND (title LIKE ? OR author LIKE ? OR book_id LIKE ?)';
            countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        if (category) {
            countQuery += ' AND category = ?';
            countParams.push(category);
        }

        const [countResult] = await pool.query(countQuery, countParams);
        const total = countResult[0].total;

        return {
            books,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    }

    // Get single book by ID
    static async getById(bookId) {
        const [books] = await pool.query(
            'SELECT * FROM books WHERE book_id = ?',
            [bookId]
        );
        return books[0] || null;
    }

    // Get borrowing statistics for a book
    static async getBorrowingStats(bookId) {
        const [stats] = await pool.query(
            'SELECT COUNT(IF(status="issued", 1, NULL)) as borrowed, COUNT(IF(status="returned", 1, NULL)) as returned FROM transactions WHERE book_id = ?',
            [bookId]
        );
        return stats[0] || { borrowed: 0, returned: 0 };
    }

    // Create a new book
    static async create(bookData) {
        const { book_id, title, author, category, isbn, publisher, publication_year, total_copies, location } = bookData;

        const available_copies = total_copies || 1;

        const [result] = await pool.query(
            'INSERT INTO books (book_id, title, author, category, isbn, publisher, publication_year, total_copies, available_copies, location) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [book_id, title, author, category || null, isbn || null, publisher || null, publication_year || null, total_copies || 1, available_copies, location || null]
        );

        return result.insertId;
    }

    // Update book details
    static async update(bookId, bookData) {
        const { title, author, category, isbn, publisher, publication_year, total_copies, location } = bookData;

        const [result] = await pool.query(
            'UPDATE books SET title = ?, author = ?, category = ?, isbn = ?, publisher = ?, publication_year = ?, total_copies = ?, location = ? WHERE book_id = ?',
            [title, author, category || null, isbn || null, publisher || null, publication_year || null, total_copies, location || null, bookId]
        );

        return result.affectedRows > 0;
    }

    // Delete a book
    static async delete(bookId) {
        const [result] = await pool.query(
            'DELETE FROM books WHERE book_id = ?',
            [bookId]
        );
        return result.affectedRows > 0;
    }

    // Get all categories
    static async getCategories() {
        const [categories] = await pool.query('SELECT DISTINCT category FROM books WHERE category IS NOT NULL ORDER BY category');
        return categories.map(c => c.category);
    }

    // Check if book exists
    static async exists(bookId) {
        const [result] = await pool.query('SELECT id FROM books WHERE book_id = ?', [bookId]);
        return result.length > 0;
    }

    // Get available copies for a book
    static async getAvailableCopies(bookId) {
        const [result] = await pool.query('SELECT available_copies FROM books WHERE book_id = ?', [bookId]);
        return result[0]?.available_copies || 0;
    }
}

module.exports = Book;
