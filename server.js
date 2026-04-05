// Express Server - Main application entry point
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
// Import routes
const booksRouter = require('./routes/books');
const membersRouter = require('./routes/members');
const transactionsRouter = require('./routes/transactions');
const dashboardRouter = require('./routes/dashboard');
const adminRouter = require('./routes/admin');

// Import middleware
const { logRequest } = require('./middleware/auth');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// MIDDLEWARE
// ============================================

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Logging middleware
app.use(morgan('combined'));
app.use(logRequest);

// ============================================
// STATIC FILES
// ============================================

const publicPath = path.join(__dirname, '../public');
app.use(express.static(publicPath));

// ============================================
// API ROUTES
// ============================================

app.use('/api/books', booksRouter);
app.use('/api/members', membersRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/admin', adminRouter);

// ============================================
// WELCOME ROUTES
// ============================================

app.get('/', (req, res) => {
    res.sendFile('index.html', { root: publicPath });
});

app.get('/api', (req, res) => {
    res.json({
        success: true,
        message: 'Library Management System API',
        version: '1.0.0',
        endpoints: {
            books: '/api/books',
            members: '/api/members',
            transactions: '/api/transactions',
            dashboard: '/api/dashboard'
        }
    });
});

// ============================================
// HEALTH CHECK
// ============================================

app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ============================================
// 404 HANDLER
// ============================================

app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route not found',
        path: req.path
    });
});

// ============================================
// ERROR HANDLER MIDDLEWARE
// ============================================

app.use((err, req, res, next) => {
    console.error('Unhandled Error:', err);

    res.status(err.status || 500).json({
        success: false,
        error: err.message || 'Internal Server Error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║  Library Management System Server      ║');
    console.log('╚════════════════════════════════════════╝\n');
    console.log(`✓ Server running on http://localhost:${PORT}`);
    console.log(`✓ API Documentation: http://localhost:${PORT}/api`);
    console.log(`✓ Frontend: http://localhost:${PORT}`);
    console.log('\nPress Ctrl+C to stop the server\n');
});

module.exports = app;
