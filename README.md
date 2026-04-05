# Library Management System

A complete, production-ready Library Management System built with **Node.js**, **Express**, **MySQL**, and **Vanilla JavaScript**. This system provides comprehensive features for managing books, members, transactions, and fines.

## 🎯 Features

### Core Features
- ✅ **Books Management**: CRUD operations with search and filtering
- ✅ **Members Management**: Manage library members with different membership types
- ✅ **Transactions**: Issue and return books with automatic fine calculation
- ✅ **Fine Management**: Automatic fine calculation (₹5/day) for overdue books
- ✅ **Card Swipe Simulation**: Member lookup with quick actions
- ✅ **Dashboard**: Real-time statistics and recent activity
- ✅ **Reports**: Export various reports in JSON/CSV/TXT formats

### Advanced Features
- 🔒 **Security**: Helmet.js, CORS, input validation, SQL injection prevention
- 📊 **Analytics**: Popular books, borrowing statistics, fine collection
- 🎨 **Modern UI**: Glassmorphism effects, responsive design, smooth animations
- 💾 **Data Persistence**: MySQL database with views, triggers, and stored procedures
- 📱 **Mobile Responsive**: Works seamlessly on desktop and mobile devices
- 🔄 **Real-time Updates**: Auto-refresh dashboard every 30 seconds

## 📋 Technology Stack

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **MySQL 2** - Database driver with promise support
- **express-validator** - Input validation
- **helmet** - Security headers
- **morgan** - HTTP logging
- **cors** - Cross-origin resource sharing
- **bcryptjs** - Password hashing (prepared for auth)
- **dotenv** - Environment configuration

### Frontend
- **HTML5** - Semantic markup
- **CSS3** - Responsive design with Flexbox and Grid
- **Vanilla JavaScript** - No frameworks, pure JS
- **Fetch API** - HTTP requests

## 🚀 Installation & Setup

### Prerequisites
- **Node.js** (v14 or higher) - [Download](https://nodejs.org/)
- **MySQL Server** (v5.7 or higher) - [Download](https://dev.mysql.com/downloads/mysql/)
- **npm** (comes with Node.js)

### Step 1: Clone/Download Project
```bash
# Navigate to project directory
cd "project div\library systems"
```

### Step 2: Setup Database

1. **Start MySQL Server**
   - Windows: Open MySQL Command Line Client or MySQL Workbench
   - MacOS/Linux: `mysql -u root -p`

2. **Create Database and Import Schema**
   ```sql
   -- Copy and paste the entire contents of database/library.sql
   -- into MySQL Command Line Client and execute
   ```

   **Or using command line:**
   ```bash
   mysql -u root -p < database/library.sql
   ```

3. **Verify Database**
   ```sql
   USE library_management;
   SHOW TABLES;
   SELECT * FROM books LIMIT 5;
   ```

### Step 3: Install Node Modules

```bash
# Navigate to server directory
cd server

# Install dependencies
npm install

# If npm install fails, try:
npm install --legacy-peer-deps
```

### Step 4: Configure Environment Variables

Edit `server/.env` file with your MySQL credentials:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=library_management
DB_PORT=3306

# Application Settings
FINE_PER_DAY=5
BORROWING_PERIOD_DAYS=14
```

### Step 5: Start the Server

```bash
# From the server directory
npm start

# Or for development with auto-reload (if nodemon is installed):
npm run dev
```

**Expected Output:**
```
╔════════════════════════════════════════╗
║  Library Management System Server      ║
╚════════════════════════════════════════╝

✓ Server running on http://localhost:5000
✓ API Documentation: http://localhost:5000/api
✓ Frontend: http://localhost:5000

Press Ctrl+C to stop the server
```

### Step 6: Access Application

Open your browser and navigate to:
```
http://localhost:5000
```

## 📖 Usage Guide

### Dashboard
- View statistics: Total Books, Active Members, Books Issued, Overdue Books
- See recent transactions and popular books
- Auto-refreshes every 30 seconds

### Books Management
- **Search**: By title, author, or book ID
- **Filter**: By category
- **Add Book**: Click "+ Add Book" button
- **Edit**: Click edit button on any row
- **Delete**: Click delete button (with confirmation)

### Members Management
- **Search**: By name, card ID, or email
- **Filter**: By status (Active, Suspended, Expired)
- **Add Member**: Click "+ Add Member" button
- **Edit**: Click edit button on any row
- **Delete**: Cannot delete members with active borrowings

### Transactions
- **Issue Book**: Click "+ Issue Book", enter book ID and member card ID
- **Return Book**: Click "↩ Return Book", enter transaction ID
- **View Overdue**: Filter by "Overdue" status
- **Fine Details**: Shown in red when overdue

### Card Swipe
- Simulates card reader with auto-submit on Enter
- Shows member details including current borrowings and unpaid fines
- Quick action buttons for issuing/returning books
- Demo cards: CARD001, CARD002, CARD003

### Settings & Reports
- **Export Data**: Download as JSON or CSV
- **Generate Reports**: Inventory, Member, Transaction, Fine Collection
- **Clear Data**: Reset database (manual process)
- **System Status**: Check database and server connection

## 🔌 API Documentation

### Base URL
```
http://localhost:5000/api
```

### Books Endpoints

```
GET  /books                 - Get all books (with pagination)
GET  /books/:bookId         - Get book details
POST /books                 - Create new book
PUT  /books/:bookId         - Update book
DELETE /books/:bookId       - Delete book
GET  /books/categories/all  - Get all categories
```

**Example Request:**
```javascript
// Get all books
fetch('http://localhost:5000/api/books?page=1&limit=10&search=Great')
  .then(res => res.json())
  .then(data => console.log(data));

// Create book
fetch('http://localhost:5000/api/books', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    book_id: 'B006',
    title: 'New Book',
    author: 'Author Name',
    category: 'Fiction',
    total_copies: 2
  })
})
```

### Members Endpoints

```
GET  /members               - Get all members (with pagination)
GET  /members/:cardId       - Get member details
GET  /members/:cardId/history - Get borrowing history
POST /members               - Create new member
PUT  /members/:cardId       - Update member
DELETE /members/:cardId     - Delete member
```

### Transactions Endpoints

```
GET  /transactions          - Get all transactions (with filters)
POST /transactions/issue    - Issue a book to member
POST /transactions/return   - Return a book
GET  /transactions/overdue  - Get overdue books
POST /transactions/pay-fine - Pay a fine
GET  /transactions/fines/:memberCardId - Get member fines
```

### Dashboard Endpoints

```
GET  /dashboard/stats              - Get statistics and recent activity
POST /dashboard/calculate-overdue  - Calculate overdue fines
```

## 📊 Database Schema

### Tables

1. **books** - Book inventory
   - book_id (unique)
   - title, author, category
   - isbn, publisher, publication_year
   - total_copies, available_copies
   - location, timestamps

2. **members** - Library members
   - card_id (unique)
   - name, email, phone
   - membership_type (Basic, Premium, Student)
   - status (active, suspended, expired)
   - max_books_allowed, registration_date
   - timestamps

3. **transactions** - Book borrowing/return
   - transaction_id (unique)
   - book_id, member_card_id (foreign keys)
   - issue_date, due_date, return_date
   - fine_amount, fine_paid
   - status (issued, returned, overdue)
   - timestamps

4. **fines** - Fine records
   - transaction_id, member_card_id (foreign keys)
   - amount, days_overdue
   - paid, paid_date
   - timestamps

5. **categories** - Book categories
   - name (unique)
   - description

### Views

- **dashboard_stats** - Aggregated statistics for dashboard

### Stored Procedures

- **CalculateOverdueFines()** - Automatically calculates fines for overdue books

### Triggers

- **update_available_copies_on_issue** - Decreases available copies when book is issued
- **update_available_copies_on_return** - Increases available copies when book is returned

## 🎨 Styling Features

- **Gradient Background**: Purple to Blue gradient
- **Glassmorphism Effects**: Modern frosted glass look
- **Smooth Animations**: All transitions are smooth
- **Status Badges**: Color-coded status indicators
- **Responsive Design**: Works on all screen sizes
- **Dark Mode Ready**: Can be easily extended with theme switching

## 🔒 Security Features

- **Input Validation**: All inputs validated with express-validator
- **SQL Injection Prevention**: Using parameterized queries with mysql2/promise
- **CORS Enabled**: Configured for development environment
- **Helmet.js**: Security-related HTTP headers
- **Error Handling**: Comprehensive error handling with user-friendly messages
- **Environment Variables**: Sensitive data stored in .env file

## 🧪 Testing & Demo

### Sample Data Included
- 5 Books (B001-B005)
- 5 Members (CARD001-CARD005)
- 5 Transactions (various states)

### Demo Card IDs
```
CARD001 - John Smith (Premium) - john.smith@email.com
CARD002 - Jane Doe (Basic) - jane.doe@email.com
CARD003 - Bob Wilson (Student) - bob.wilson@email.com
CARD004 - Alice Johnson (Premium) - alice.johnson@email.com
CARD005 - Charlie Brown (Basic) - charlie.brown@email.com
```

### Quick Test Flow
1. Go to Dashboard - See statistics
2. Go to Card Swipe - Click "Demo: CARD001"
3. View current borrowings and fines
4. Click "+ Issue Book" - Try issuing B002
5. Go to Transactions - See new transaction
6. Click "↩ Return Book" - Return the transaction
7. Check fine calculation if overdue

## 📝 Membership Types & Limits

| Type | Max Books | Duration |
|------|-----------|----------|
| Basic | 5 | 14 days |
| Premium | 10 | 14 days |
| Student | 3 | 14 days |

## 💰 Fine System

- **Fine Rate**: ₹5 per day overdue
- **Automatic Calculation**: Fines calculated when book is returned or via dashboard
- **Payment Recording**: Mark fines as paid through dashboard
- **Unpaid Fines**: Members cannot issue books if they have unpaid fines

## 🛠️ Troubleshooting

### "Cannot connect to MySQL server"
- Ensure MySQL is running
- Check DB credentials in `.env` file
- Verify database name in `.env`

### "Port 5000 already in use"
- Change PORT in `.env` file
- Or kill process using port: `lsof -ti:5000 | xargs kill -9`

### "Module not found" errors
- Delete `node_modules` folder
- Run `npm install` again
- Try `npm install --legacy-peer-deps`

### Frontend not loading
- Check if server is running (should see console message)
- Clear browser cache (Ctrl+Shift+Delete)
- Try different port in `.env` and update frontend URL

### Database errors
- Verify all tables created: `SHOW TABLES;`
- Check foreign key constraints: `SELECT * FROM information_schema.REFERENTIAL_CONSTRAINTS;`
- Recreate database if corrupted

## 📋 API Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "details": [ ... ]
}
```

## 🔧 Advanced Configuration

### Change Fine Rate
Edit `server/.env`:
```env
FINE_PER_DAY=10
```

Update calculation in `server/models/Transaction.js`:
```javascript
fineAmount = daysOverdue * process.env.FINE_PER_DAY;
```

### Change Borrowing Period
Edit `server/.env`:
```env
BORROWING_PERIOD_DAYS=21
```

Update in `server/models/Transaction.js` issueBook method:
```javascript
const dueDate = new Date(Date.now() + process.env.BORROWING_PERIOD_DAYS * 24 * 60 * 60 * 1000);
```

## 📦 Project Structure

```
library-management-system/
├── server/
│   ├── config/
│   │   └── database.js          # MySQL configuration
│   ├── models/
│   │   ├── Book.js              # Book model
│   │   ├── Member.js            # Member model
│   │   └── Transaction.js       # Transaction model
│   ├── routes/
│   │   ├── books.js             # Book endpoints
│   │   ├── members.js           # Member endpoints
│   │   ├── transactions.js      # Transaction endpoints
│   │   └── dashboard.js         # Dashboard endpoints
│   ├── middleware/
│   │   └── auth.js              # Auth middleware
│   ├── server.js                # Express app
│   ├── package.json             # Dependencies
│   └── .env                     # Environment vars
├── public/
│   ├── index.html               # Frontend
│   ├── css/
│   │   └── style.css            # Styling
│   └── js/
│       └── app.js               # Application logic
├── database/
│   └── library.sql              # Database schema
└── README.md                    # This file
```

## 📄 License

This project is provided as-is for educational purposes.

## 🙋 Support

For issues, questions, or improvements:
1. Check the Troubleshooting section
2. Review the API documentation
3. Check console logs for detailed error messages
4. Verify database setup with: `USE library_management; SHOW TABLES;`

## ✨ Future Enhancements

- User authentication with JWT
- Email notifications for overdue books
- Advanced reporting with charts
- Mobile app with React Native
- Book reservations system
- Member reviews and ratings
- Search with Elasticsearch
- API rate limiting

---

**Happy reading and managing! 📚**

Built with ❤️ for library management.
