-- Library Management System Database Schema
-- MySQL Database Script

-- Create Database
CREATE DATABASE IF NOT EXISTS library_management;
USE library_management;

-- ============================================
-- CATEGORY TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- BOOKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS books (
    id INT AUTO_INCREMENT PRIMARY KEY,
    book_id VARCHAR(20) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    isbn VARCHAR(20) UNIQUE,
    publisher VARCHAR(255),
    publication_year YEAR,
    total_copies INT DEFAULT 1,
    available_copies INT DEFAULT 1,
    location VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_book_id (book_id),
    INDEX idx_title (title),
    INDEX idx_author (author),
    INDEX idx_category (category),
    INDEX idx_isbn (isbn)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- MEMBERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS members (
    id INT AUTO_INCREMENT PRIMARY KEY,
    card_id VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    membership_type ENUM('Basic', 'Premium', 'Student') DEFAULT 'Basic',
    max_books_allowed INT DEFAULT 5,
    registration_date DATE DEFAULT (CURDATE()),
    status ENUM('active', 'suspended', 'expired') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_card_id (card_id),
    INDEX idx_email (email),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TRANSACTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    transaction_id VARCHAR(30) UNIQUE NOT NULL,
    book_id VARCHAR(20) NOT NULL,
    member_card_id VARCHAR(20) NOT NULL,
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    return_date DATE,
    fine_amount DECIMAL(10,2) DEFAULT 0.00,
    fine_paid BOOLEAN DEFAULT FALSE,
    status ENUM('issued', 'returned', 'overdue') DEFAULT 'issued',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_transaction_id (transaction_id),
    INDEX idx_book_id (book_id),
    INDEX idx_member_card_id (member_card_id),
    INDEX idx_status (status),
    INDEX idx_due_date (due_date),
    FOREIGN KEY (book_id) REFERENCES books(book_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (member_card_id) REFERENCES members(card_id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- FINES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS fines (
    id INT AUTO_INCREMENT PRIMARY KEY,
    transaction_id VARCHAR(30) NOT NULL,
    member_card_id VARCHAR(20) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    days_overdue INT,
    paid BOOLEAN DEFAULT FALSE,
    paid_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_transaction_id (transaction_id),
    INDEX idx_member_card_id (member_card_id),
    FOREIGN KEY (transaction_id) REFERENCES transactions(transaction_id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (member_card_id) REFERENCES members(card_id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- VIEWS
-- ============================================

-- Dashboard Statistics View
CREATE OR REPLACE VIEW dashboard_stats AS
SELECT
    (SELECT COUNT(*) FROM books) AS total_books,
    (SELECT COUNT(*) FROM members WHERE status = 'active') AS active_members,
    (SELECT COUNT(*) FROM transactions WHERE status = 'issued') AS books_issued,
    (SELECT COUNT(*) FROM transactions WHERE status = 'overdue') AS overdue_books,
    (SELECT COUNT(*) FROM transactions WHERE status = 'returned') AS books_returned;

-- ============================================
-- STORED PROCEDURES
-- ============================================

DELIMITER $$

-- Calculate fines for overdue books
CREATE PROCEDURE IF NOT EXISTS CalculateOverdueFines()
BEGIN
    DECLARE v_date DATE;
    DECLARE v_transaction_id VARCHAR(30);
    DECLARE v_member_card_id VARCHAR(20);
    DECLARE v_days_overdue INT;
    DECLARE v_fine_amount DECIMAL(10,2);
    DECLARE done INT DEFAULT FALSE;

    DECLARE cur CURSOR FOR
        SELECT transaction_id, member_card_id, DATEDIFF(CURDATE(), due_date)
        FROM transactions
        WHERE status = 'issued' AND due_date < CURDATE();

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

    OPEN cur;

    read_loop: LOOP
        FETCH cur INTO v_transaction_id, v_member_card_id, v_days_overdue;
        IF done THEN
            LEAVE read_loop;
        END IF;

        SET v_fine_amount = v_days_overdue * 5;

        -- Update transaction status and fine amount
        UPDATE transactions
        SET status = 'overdue', fine_amount = v_fine_amount
        WHERE transaction_id = v_transaction_id;

        -- Insert or update fine record
        INSERT INTO fines (transaction_id, member_card_id, amount, days_overdue, paid)
        VALUES (v_transaction_id, v_member_card_id, v_fine_amount, v_days_overdue, FALSE)
        ON DUPLICATE KEY UPDATE
            amount = v_fine_amount,
            days_overdue = v_days_overdue;
    END LOOP;

    CLOSE cur;
END$$

DELIMITER ;

-- ============================================
-- TRIGGERS
-- ============================================

DELIMITER $$

-- Trigger: Decrease available copies when book is issued
CREATE TRIGGER IF NOT EXISTS update_available_copies_on_issue
AFTER INSERT ON transactions
FOR EACH ROW
BEGIN
    UPDATE books
    SET available_copies = available_copies - 1
    WHERE book_id = NEW.book_id;
END$$

-- Trigger: Increase available copies when book is returned
CREATE TRIGGER IF NOT EXISTS update_available_copies_on_return
AFTER UPDATE ON transactions
FOR EACH ROW
BEGIN
    IF NEW.status = 'returned' AND OLD.status = 'issued' THEN
        UPDATE books
        SET available_copies = available_copies + 1
        WHERE book_id = NEW.book_id;
    END IF;
END$$

DELIMITER ;

-- ============================================
-- SAMPLE DATA
-- ============================================

-- Insert Categories
INSERT INTO categories (name, description) VALUES
('Fiction', 'Novels and fictional stories'),
('Non-Fiction', 'Educational and informational books'),
('Technology', 'Computer science and programming'),
('History', 'Historical events and biographies'),
('Science', 'Scientific discoveries and research');

-- Insert Books
INSERT INTO books (book_id, title, author, category, isbn, publisher, publication_year, total_copies, available_copies, location) VALUES
('B001', 'The Great Gatsby', 'F. Scott Fitzgerald', 'Fiction', '978-0743273565', 'Scribner', 1925, 3, 2, 'Shelf A1'),
('B002', '1984', 'George Orwell', 'Fiction', '978-0451524935', 'Signet Classic', 1949, 5, 4, 'Shelf A2'),
('B003', 'Python Crash Course', 'Eric Matthes', 'Technology', '978-1593275099', 'No Starch Press', 2015, 2, 1, 'Shelf B1'),
('B004', 'Sapiens', 'Yuval Noah Harari', 'History', '978-0062316097', 'Harper', 2011, 4, 3, 'Shelf C1'),
('B005', 'Clean Code', 'Robert C. Martin', 'Technology', '978-0132350884', 'Prentice Hall', 2008, 3, 2, 'Shelf B2');

-- Insert Members
INSERT INTO members (card_id, name, email, phone, address, membership_type, max_books_allowed, status) VALUES
('CARD001', 'John Smith', 'john.smith@email.com', '9876543210', '123 Main St, City', 'Premium', 10, 'active'),
('CARD002', 'Jane Doe', 'jane.doe@email.com', '9876543211', '456 Oak Ave, Town', 'Basic', 5, 'active'),
('CARD003', 'Bob Wilson', 'bob.wilson@email.com', '9876543212', '789 Pine Rd, Village', 'Student', 3, 'active'),
('CARD004', 'Alice Johnson', 'alice.johnson@email.com', '9876543213', '321 Elm St, Metro', 'Premium', 10, 'active'),
('CARD005', 'Charlie Brown', 'charlie.brown@email.com', '9876543214', '654 Birch Ln, State', 'Basic', 5, 'active');

-- Insert Sample Transactions
-- Transaction 1: Issued (John Smith - B001)
INSERT INTO transactions (transaction_id, book_id, member_card_id, issue_date, due_date, status) VALUES
('TXN001', 'B001', 'CARD001', DATE_SUB(CURDATE(), INTERVAL 7 DAY), DATE_ADD(CURDATE(), INTERVAL 7 DAY), 'issued');

-- Transaction 2: Returned (Jane Doe - B002)
INSERT INTO transactions (transaction_id, book_id, member_card_id, issue_date, due_date, return_date, status) VALUES
('TXN002', 'B002', 'CARD002', DATE_SUB(CURDATE(), INTERVAL 30 DAY), DATE_SUB(CURDATE(), INTERVAL 15 DAY), DATE_SUB(CURDATE(), INTERVAL 10 DAY), 'returned');

-- Transaction 3: Overdue (Bob Wilson - B003)
INSERT INTO transactions (transaction_id, book_id, member_card_id, issue_date, due_date, fine_amount, fine_paid, status) VALUES
('TXN003', 'B003', 'CARD003', DATE_SUB(CURDATE(), INTERVAL 15 DAY), DATE_SUB(CURDATE(), INTERVAL 5 DAY), 50.00, FALSE, 'overdue');

-- Transaction 4: Issued (Alice Johnson - B004)
INSERT INTO transactions (transaction_id, book_id, member_card_id, issue_date, due_date, status) VALUES
('TXN004', 'B004', 'CARD004', DATE_SUB(CURDATE(), INTERVAL 5 DAY), DATE_ADD(CURDATE(), INTERVAL 9 DAY), 'issued');

-- Transaction 5: Returned (Charlie Brown - B005)
INSERT INTO transactions (transaction_id, book_id, member_card_id, issue_date, due_date, return_date, status) VALUES
('TXN005', 'B005', 'CARD005', DATE_SUB(CURDATE(), INTERVAL 20 DAY), DATE_SUB(CURDATE(), INTERVAL 5 DAY), DATE_SUB(CURDATE(), INTERVAL 3 DAY), 'returned');

-- Insert Fines for Overdue Books
INSERT INTO fines (transaction_id, member_card_id, amount, days_overdue, paid) VALUES
('TXN003', 'CARD003', 50.00, 5, FALSE);

-- ============================================
-- VERIFY SETUP
-- ============================================
-- Select to verify all data is inserted
SELECT 'Database setup completed successfully' AS status;
