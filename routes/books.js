// Books Routes - REST API endpoints for book management
const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const router = express.Router();
const Book = require('../models/Book');

// Middleware to handle validation errors
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: 'Validation error', details: errors.array() });
    }
    next();
};

// GET /api/books - Get all books with pagination, search, and filtering
router.get('/',
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('search').optional().isString().trim(),
    query('category').optional().isString().trim(),
    handleValidationErrors,
    async (req, res) => {
        try {
            const { page = 1, limit = 10, search = '', category = '' } = req.query;
            const result = await Book.getAll(page, limit, search, category);
            res.json({ success: true, data: result });
        } catch (error) {
            console.error('Error fetching books:', error);
            res.status(500).json({ success: false, error: 'Failed to fetch books' });
        }
    }
);

// GET /api/books/categories/all - Get all categories
router.get('/categories/all', async (req, res) => {
    try {
        const categories = await Book.getCategories();
        res.json({ success: true, data: categories });
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch categories' });
    }
});

// GET /api/books/:bookId - Get single book details
router.get('/:bookId',
    param('bookId').isString().trim(),
    handleValidationErrors,
    async (req, res) => {
        try {
            const { bookId } = req.params;
            const book = await Book.getById(bookId);

            if (!book) {
                return res.status(404).json({ success: false, error: 'Book not found' });
            }

            const stats = await Book.getBorrowingStats(bookId);
            res.json({ success: true, data: { ...book, borrowing_stats: stats } });
        } catch (error) {
            console.error('Error fetching book:', error);
            res.status(500).json({ success: false, error: 'Failed to fetch book' });
        }
    }
);

// POST /api/books - Create a new book
router.post('/',
    body('book_id').notEmpty().isString().trim().withMessage('Book ID is required'),
    body('title').notEmpty().isString().trim().withMessage('Title is required'),
    body('author').notEmpty().isString().trim().withMessage('Author is required'),
    body('category').optional().isString().trim(),
    body('isbn').optional().isString().trim(),
    body('publisher').optional().isString().trim(),
    body('publication_year').optional().isInt({ min: 1000, max: 9999 }).toInt(),
    body('total_copies').optional().isInt({ min: 1 }).toInt(),
    body('location').optional().isString().trim(),
    handleValidationErrors,
    async (req, res) => {
        try {
            const { book_id, title, author, category, isbn, publisher, publication_year, total_copies, location } = req.body;

            // Check if book already exists
            const exists = await Book.exists(book_id);
            if (exists) {
                return res.status(409).json({ success: false, error: 'Book with this ID already exists' });
            }

            await Book.create({
                book_id,
                title,
                author,
                category,
                isbn,
                publisher,
                publication_year,
                total_copies,
                location
            });

            res.status(201).json({ success: true, message: 'Book created successfully' });
        } catch (error) {
            console.error('Error creating book:', error);
            res.status(500).json({ success: false, error: 'Failed to create book' });
        }
    }
);

// PUT /api/books/:bookId - Update book details
router.put('/:bookId',
    param('bookId').isString().trim(),
    body('title').optional().isString().trim(),
    body('author').optional().isString().trim(),
    body('category').optional().isString().trim(),
    body('isbn').optional().isString().trim(),
    body('publisher').optional().isString().trim(),
    body('publication_year').optional().isInt({ min: 1000, max: 9999 }).toInt(),
    body('total_copies').optional().isInt({ min: 1 }).toInt(),
    body('location').optional().isString().trim(),
    handleValidationErrors,
    async (req, res) => {
        try {
            const { bookId } = req.params;

            // Check if book exists
            const book = await Book.getById(bookId);
            if (!book) {
                return res.status(404).json({ success: false, error: 'Book not found' });
            }

            const { title, author, category, isbn, publisher, publication_year, total_copies, location } = req.body;

            await Book.update(bookId, {
                title: title || book.title,
                author: author || book.author,
                category: category || book.category,
                isbn: isbn || book.isbn,
                publisher: publisher || book.publisher,
                publication_year: publication_year || book.publication_year,
                total_copies: total_copies || book.total_copies,
                location: location || book.location
            });

            res.json({ success: true, message: 'Book updated successfully' });
        } catch (error) {
            console.error('Error updating book:', error);
            res.status(500).json({ success: false, error: 'Failed to update book' });
        }
    }
);

// DELETE /api/books/:bookId - Delete a book
router.delete('/:bookId',
    param('bookId').isString().trim(),
    handleValidationErrors,
    async (req, res) => {
        try {
            const { bookId } = req.params;

            // Check if book exists
            const book = await Book.getById(bookId);
            if (!book) {
                return res.status(404).json({ success: false, error: 'Book not found' });
            }

            await Book.delete(bookId);
            res.json({ success: true, message: 'Book deleted successfully' });
        } catch (error) {
            if (error.message.includes('foreign key')) {
                return res.status(400).json({ success: false, error: 'Cannot delete book with active transactions' });
            }
            console.error('Error deleting book:', error);
            res.status(500).json({ success: false, error: 'Failed to delete book' });
        }
    }
);

module.exports = router;
