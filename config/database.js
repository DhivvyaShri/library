// Database Configuration using mysql2/promise
const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'library_management',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true
});

// Test database connection
pool.getConnection()
    .then(connection => {
        console.log('✓ MySQL Database Connected Successfully');
        connection.release();
    })
    .catch(err => {
        console.error('✗ MySQL Database Connection Error:', err.message);
        process.exit(1);
    });

module.exports = pool;
