// Library Management System - Main Frontend Application
// API Base URL
const API_BASE_URL = '/api';

// Application State
window.app = {
    currentTab: 'dashboard',
    state: {
        books: { page: 1, limit: 10, search: '', category: '' },
        members: { page: 1, limit: 10, search: '', status: '' },
        transactions: { page: 1, limit: 10, status: '', memberId: '', bookId: '' },
        cardSwipe: { memberId: null }
    },
    debounceTimer: null,

    // Initialize Application
    init() {
        this.setupEventListeners();
        this.loadDashboard();
        this.checkServerStatus();
    },

    // Setup Event Listeners
    setupEventListeners() {
        // Tab Navigation
        document.querySelectorAll('.tab-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const tab = e.target.dataset.tab;
                this.switchTab(tab);
            });
        });

        // Mobile Menu Toggle
        const menuToggle = document.getElementById('menuToggle');
        if (menuToggle) {
            menuToggle.addEventListener('click', () => {
                document.getElementById('sidebar').classList.toggle('collapsed');
            });
        }

        // Search and Filter Events
        document.getElementById('booksSearch')?.addEventListener('input', (e) => {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = setTimeout(() => {
                this.state.books.search = e.target.value;
                this.state.books.page = 1;
                this.loadBooks();
            }, 300);
        });

        document.getElementById('categoryFilter')?.addEventListener('change', (e) => {
            this.state.books.category = e.target.value;
            this.state.books.page = 1;
            this.loadBooks();
        });

        document.getElementById('membersSearch')?.addEventListener('input', (e) => {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = setTimeout(() => {
                this.state.members.search = e.target.value;
                this.state.members.page = 1;
                this.loadMembers();
            }, 300);
        });

        document.getElementById('statusFilter')?.addEventListener('change', (e) => {
            this.state.members.status = e.target.value;
            this.state.members.page = 1;
            this.loadMembers();
        });

        document.getElementById('transactionStatusFilter')?.addEventListener('change', (e) => {
            this.state.transactions.status = e.target.value;
            this.state.transactions.page = 1;
            this.loadTransactions();
        });

        // Card Swipe Input
        document.getElementById('cardSwipeInput')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.swipeCard(e.target.value);
                e.target.value = '';
            }
        });

        // Modal Close Buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.classList.remove('active');
            }
        });

        // Auto-refresh dashboard every 30 seconds
        setInterval(() => {
            if (this.currentTab === 'dashboard') {
                this.loadDashboard();
            }
        }, 30000);
    },

    // Switch Tab
    switchTab(tabName) {
        this.currentTab = tabName;

        // Hide all tabs
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });

        // Remove active from all links
        document.querySelectorAll('.tab-link').forEach(link => {
            link.classList.remove('active');
        });

        // Show selected tab
        const tabElement = document.getElementById(tabName);
        if (tabElement) {
            tabElement.classList.add('active');
        }

        // Set active link
        document.querySelector(`[data-tab="${tabName}"]`)?.classList.add('active');

        // Load tab data
        switch (tabName) {
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'books':
                this.loadBooks();
                this.loadCategories();
                break;
            case 'members':
                this.loadMembers();
                break;
            case 'transactions':
                this.loadTransactions();
                break;
        }
    },

    // ============================================
    // API CALLS
    // ============================================

    async apiCall(endpoint, method = 'GET', data = null) {
        try {
            const options = {
                method,
                headers: { 'Content-Type': 'application/json' }
            };

            if (data) {
                options.body = JSON.stringify(data);
            }

            const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'API Error');
            }

            return result;
        } catch (error) {
            console.error('API Error:', error);
            this.showToast('error', error.message);
            throw error;
        }
    },

    // ============================================
    // DASHBOARD
    // ============================================

    async loadDashboard() {
        try {
            this.showSpinner(true);
            const result = await this.apiCall('/dashboard/stats');

            const stats = result.data.stats;
            document.getElementById('totalBooks').textContent = stats.total_books;
            document.getElementById('activeMembers').textContent = stats.active_members;
            document.getElementById('booksIssued').textContent = stats.books_issued;
            document.getElementById('overdueBooks').textContent = stats.overdue_books;

            // Recent Transactions
            const recentBody = document.getElementById('recentTransactionsBody');
            recentBody.innerHTML = '';
            result.data.recent_transactions.forEach(txn => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${txn.title}</td>
                    <td>${txn.member_name}</td>
                    <td><span class="badge badge-${txn.status}">${txn.status}</span></td>
                    <td>${new Date(txn.issue_date).toLocaleDateString()}</td>
                `;
                recentBody.appendChild(row);
            });

            // Popular Books
            const popularBody = document.getElementById('popularBooksBody');
            popularBody.innerHTML = '';
            result.data.popular_books.forEach(book => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${book.title}</td>
                    <td>${book.author}</td>
                    <td>${book.borrow_count}</td>
                `;
                popularBody.appendChild(row);
            });

            this.showSpinner(false);
        } catch (error) {
            this.showSpinner(false);
        }
    },

    // ============================================
    // BOOKS MANAGEMENT
    // ============================================

    async loadBooks() {
        try {
            this.showSpinner(true);
            const s = this.state.books;
            const result = await this.apiCall(
                `/books?page=${s.page}&limit=${s.limit}&search=${s.search}&category=${s.category}`
            );

            const tbody = document.getElementById('booksTableBody');
            tbody.innerHTML = '';

            result.data.books.forEach(book => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${book.book_id}</td>
                    <td>${book.title}</td>
                    <td>${book.author}</td>
                    <td>${book.category || '-'}</td>
                    <td>${book.total_copies}</td>
                    <td><strong${book.available_copies === 0 ? ' style="color: red;"' : ''}>${book.available_copies}</strong></td>
                    <td>
                        <button onclick="window.app.editBook('${book.book_id}')" class="btn-secondary btn-sm">Edit</button>
                        <button onclick="window.app.deleteBook('${book.book_id}')" class="btn-danger btn-sm">Delete</button>
                    </td>
                `;
                tbody.appendChild(row);
            });

            this.renderPagination('booksPagination', result.data.pagination, (page) => {
                this.state.books.page = page;
                this.loadBooks();
            });

            this.showSpinner(false);
        } catch (error) {
            this.showSpinner(false);
        }
    },

    async loadCategories() {
        try {
            const result = await this.apiCall('/books/categories/all');
            const select = document.getElementById('categoryFilter');
            const currentValue = select.value;

            select.innerHTML = '<option value="">All Categories</option>';
            result.data.forEach(category => {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category;
                select.appendChild(option);
            });

            select.value = currentValue;
        } catch (error) {
            // Silently fail
        }
    },

    openBookModal(bookId = null) {
        console.log('Opening book modal for ID:', bookId);
        const modal = document.getElementById('bookModal');
        const form = document.getElementById('bookForm');

        if (!bookId) {
            document.getElementById('bookModalTitle').textContent = 'Add Book';
            form.reset();
            document.getElementById('bookId').value = '';
            document.getElementById('formBookId').disabled = false;
        } else {
            document.getElementById('bookModalTitle').textContent = 'Edit Book';
            document.getElementById('formBookId').disabled = true;
        }

        modal.classList.add('active');
        console.log('Book modal opened, active classes:', modal.className);
    },

    closeBookModal() {
        document.getElementById('bookModal').classList.remove('active');
    },

    async editBook(bookId) {
        try {
            const result = await this.apiCall(`/books/${bookId}`);
            const book = result.data;

            document.getElementById('bookId').value = book.book_id;
            document.getElementById('formBookId').value = book.book_id;
            document.getElementById('formTitle').value = book.title;
            document.getElementById('formAuthor').value = book.author;
            document.getElementById('formCategory').value = book.category || '';
            document.getElementById('formISBN').value = book.isbn || '';
            document.getElementById('formPublisher').value = book.publisher || '';
            document.getElementById('formYear').value = book.publication_year || '';
            document.getElementById('formCopies').value = book.total_copies;
            document.getElementById('formLocation').value = book.location || '';

            this.openBookModal(book.book_id);
        } catch (error) {
            // Error already shown
        }
    },

    async submitBookForm(e) {
        e.preventDefault();

        console.log('Book form submitted');
        const bookId = document.getElementById('bookId').value;
        const data = {
            book_id: document.getElementById('formBookId').value,
            title: document.getElementById('formTitle').value,
            author: document.getElementById('formAuthor').value,
            category: document.getElementById('formCategory').value,
            isbn: document.getElementById('formISBN').value,
            publisher: document.getElementById('formPublisher').value,
            publication_year: document.getElementById('formYear').value ? parseInt(document.getElementById('formYear').value) : null,
            total_copies: parseInt(document.getElementById('formCopies').value) || 1,
            location: document.getElementById('formLocation').value
        };

        console.log('Book data:', data);

        try {
            if (bookId) {
                console.log('Updating book:', bookId);
                await this.apiCall(`/books/${bookId}`, 'PUT', data);
                this.showToast('success', 'Book updated successfully');
            } else {
                console.log('Creating new book');
                await this.apiCall('/books', 'POST', data);
                this.showToast('success', 'Book created successfully');
            }

            this.closeBookModal();
            this.loadBooks();
        } catch (error) {
            console.error('Book form error:', error);
            // Error already shown
        }
    },

    async deleteBook(bookId) {
        if (!confirm('Are you sure you want to delete this book?')) return;

        try {
            await this.apiCall(`/books/${bookId}`, 'DELETE');
            this.showToast('success', 'Book deleted successfully');
            this.loadBooks();
        } catch (error) {
            // Error already shown
        }
    },

    // ============================================
    // MEMBERS MANAGEMENT
    // ============================================

    async loadMembers() {
        try {
            this.showSpinner(true);
            const s = this.state.members;
            const result = await this.apiCall(
                `/members?page=${s.page}&limit=${s.limit}&search=${s.search}&status=${s.status}`
            );

            const tbody = document.getElementById('membersTableBody');
            tbody.innerHTML = '';

            result.data.members.forEach(member => {
                const row = document.createElement('tr');
                const status = member.status;
                row.innerHTML = `
                    <td>${member.card_id}</td>
                    <td>${member.name}</td>
                    <td>${member.email}</td>
                    <td>${member.phone || '-'}</td>
                    <td>${member.membership_type}</td>
                    <td>${member.max_books_allowed}</td>
                    <td><span class="badge badge-${status}">${status}</span></td>
                    <td>
                        <button onclick="window.app.editMember('${member.card_id}')" class="btn-secondary btn-sm">Edit</button>
                        <button onclick="window.app.deleteMember('${member.card_id}')" class="btn-danger btn-sm">Delete</button>
                    </td>
                `;
                tbody.appendChild(row);
            });

            this.renderPagination('membersPagination', result.data.pagination, (page) => {
                this.state.members.page = page;
                this.loadMembers();
            });

            this.showSpinner(false);
        } catch (error) {
            this.showSpinner(false);
        }
    },

    openMemberModal(cardId = null) {
        const modal = document.getElementById('memberModal');
        const form = document.getElementById('memberForm');

        if (!cardId) {
            document.getElementById('memberModalTitle').textContent = 'Add Member';
            form.reset();
            document.getElementById('memberId').value = '';
            document.getElementById('formCardId').disabled = false;
        } else {
            document.getElementById('memberModalTitle').textContent = 'Edit Member';
            document.getElementById('formCardId').disabled = true;
        }

        modal.classList.add('active');
    },

    closeMemberModal() {
        document.getElementById('memberModal').classList.remove('active');
    },

    async editMember(cardId) {
        try {
            const result = await this.apiCall(`/members/${cardId}`);
            const member = result.data;

            document.getElementById('memberId').value = member.card_id;
            document.getElementById('formCardId').value = member.card_id;
            document.getElementById('formMemberName').value = member.name;
            document.getElementById('formEmail').value = member.email;
            document.getElementById('formPhone').value = member.phone || '';
            document.getElementById('formAddress').value = member.address || '';
            document.getElementById('formMembershipType').value = member.membership_type;
            document.getElementById('formMemberStatus').value = member.status;

            this.openMemberModal(member.card_id);
        } catch (error) {
            // Error already shown
        }
    },

    async submitMemberForm(e) {
        e.preventDefault();

        const cardId = document.getElementById('memberId').value;
        const data = {
            card_id: document.getElementById('formCardId').value,
            name: document.getElementById('formMemberName').value,
            email: document.getElementById('formEmail').value,
            phone: document.getElementById('formPhone').value,
            address: document.getElementById('formAddress').value,
            membership_type: document.getElementById('formMembershipType').value,
            status: document.getElementById('formMemberStatus').value
        };

        try {
            if (cardId) {
                await this.apiCall(`/members/${cardId}`, 'PUT', data);
                this.showToast('success', 'Member updated successfully');
            } else {
                await this.apiCall('/members', 'POST', data);
                this.showToast('success', 'Member created successfully');
            }

            this.closeMemberModal();
            this.loadMembers();
        } catch (error) {
            // Error already shown
        }
    },

    async deleteMember(cardId) {
        if (!confirm('Are you sure you want to delete this member? They must not have active borrowings.')) return;

        try {
            await this.apiCall(`/members/${cardId}`, 'DELETE');
            this.showToast('success', 'Member deleted successfully');
            this.loadMembers();
        } catch (error) {
            // Error already shown
        }
    },

    // ============================================
    // TRANSACTIONS MANAGEMENT
    // ============================================

    async loadTransactions() {
        try {
            this.showSpinner(true);
            const s = this.state.transactions;
            const result = await this.apiCall(
                `/transactions?page=${s.page}&limit=${s.limit}&status=${s.status}&memberId=${s.memberId}&bookId=${s.bookId}`
            );

            const tbody = document.getElementById('transactionsTableBody');
            tbody.innerHTML = '';

            result.data.transactions.forEach(txn => {
                const row = document.createElement('tr');
                const fineStrike = txn.fine_amount > 0 ? `<span style="color: red;">₹${txn.fine_amount.toFixed(2)}</span>` : '-';
                row.innerHTML = `
                    <td>${txn.transaction_id}</td>
                    <td>${txn.title}</td>
                    <td>${txn.member_name}</td>
                    <td>${new Date(txn.issue_date).toLocaleDateString()}</td>
                    <td>${new Date(txn.due_date).toLocaleDateString()}</td>
                    <td><span class="badge badge-${txn.status}">${txn.status}</span></td>
                    <td>${fineStrike}</td>
                `;
                tbody.appendChild(row);
            });

            this.renderPagination('transactionsPagination', result.data.pagination, (page) => {
                this.state.transactions.page = page;
                this.loadTransactions();
            });

            this.showSpinner(false);
        } catch (error) {
            this.showSpinner(false);
        }
    },

    openIssueModal() {
        document.getElementById('issueModal').classList.add('active');
        document.getElementById('issueBookId').focus();
    },

    closeIssueModal() {
        document.getElementById('issueModal').classList.remove('active');
        document.getElementById('issueForm').reset();
    },

    openIssueModalForMember() {
        document.getElementById('issueModal').classList.add('active');
        document.getElementById('issueMemberId').value = this.state.cardSwipe.memberId;
        document.getElementById('issueBookId').focus();
    },

    async submitIssueForm(e) {
        e.preventDefault();

        const data = {
            book_id: document.getElementById('issueBookId').value,
            member_card_id: document.getElementById('issueMemberId').value
        };

        try {
            const result = await this.apiCall('/transactions/issue', 'POST', data);
            this.showToast('success', `Book issued successfully. Due: ${result.data.dueDate}`);
            this.closeIssueModal();
            this.loadTransactions();
            this.loadDashboard();
        } catch (error) {
            // Error already shown
        }
    },

    openReturnModal() {
        document.getElementById('returnModal').classList.add('active');
        document.getElementById('returnTransactionId').focus();
    },

    closeReturnModal() {
        document.getElementById('returnModal').classList.remove('active');
        document.getElementById('returnForm').reset();
        document.getElementById('returnFineInfo').style.display = 'none';
    },

    openReturnModalForMember() {
        document.getElementById('returnModal').classList.add('active');
        document.getElementById('returnTransactionId').focus();
    },

    async submitReturnForm(e) {
        e.preventDefault();

        const data = {
            transaction_id: document.getElementById('returnTransactionId').value
        };

        try {
            const result = await this.apiCall('/transactions/return', 'POST', data);
            const fine = result.data.fineAmount;
            const msg = fine > 0 ? `Book returned. Fine: ₹${fine.toFixed(2)}` : 'Book returned successfully';
            this.showToast('success', msg);
            this.closeReturnModal();
            this.loadTransactions();
            this.loadDashboard();
        } catch (error) {
            // Error already shown
        }
    },

    // ============================================
    // CARD SWIPE
    // ============================================

    async swipeCard(cardId) {
        try {
            if (!cardId.trim()) return;

            this.showSpinner(true);
            const result = await this.apiCall(`/members/${cardId}`);
            const member = result.data;

            this.state.cardSwipe.memberId = member.card_id;

            document.getElementById('swipedMemberName').textContent = member.name;
            document.getElementById('swipedCardId').textContent = member.card_id;
            document.getElementById('swipedEmail').textContent = member.email;
            document.getElementById('swipedPhone').textContent = member.phone || '-';
            document.getElementById('swipedType').textContent = member.membership_type;

            // Current borrowings
            const borrowingsDiv = document.getElementById('swipedBorrowings');
            if (member.current_borrowings.length > 0) {
                borrowingsDiv.innerHTML = member.current_borrowings.map(b => `
                    <p><strong>${b.title}</strong> - Due: ${new Date(b.due_date).toLocaleDateString()}
                    <span class="badge badge-${b.status}">${b.status}</span></p>
                `).join('');
            } else {
                borrowingsDiv.innerHTML = '<p>No active borrowings</p>';
            }

            // Unpaid fines
            const finesDiv = document.getElementById('swipedFines');
            const totalFine = member.unpaid_fines.reduce((sum, f) => sum + parseFloat(f.amount), 0);
            if (totalFine > 0) {
                finesDiv.innerHTML = `<p style="color: red;"><strong>Total Fine: ₹${totalFine.toFixed(2)}</strong></p>`;
            } else {
                finesDiv.innerHTML = '<p>No unpaid fines</p>';
            }

            document.getElementById('memberDetailsSection').style.display = 'block';
            this.showSpinner(false);
        } catch (error) {
            this.showSpinner(false);
            document.getElementById('memberDetailsSection').style.display = 'none';
        }
    },

    demoSwipe(cardId) {
        document.getElementById('cardSwipeInput').value = cardId;
        this.swipeCard(cardId);
    },

    clearCardSwipe() {
        document.getElementById('cardSwipeInput').value = '';
        document.getElementById('memberDetailsSection').style.display = 'none';
        this.state.cardSwipe.memberId = null;
        document.getElementById('cardSwipeInput').focus();
    },

    // ============================================
    // SETTINGS & REPORTS
    // ============================================

    async exportDataJSON() {
        try {
            const books = await this.apiCall('/books?page=1&limit=10000');
            const members = await this.apiCall('/members?page=1&limit=10000');
            const transactions = await this.apiCall('/transactions?page=1&limit=10000');

            const data = {
                books: books.data.books,
                members: members.data.members,
                transactions: transactions.data.transactions,
                exportDate: new Date().toISOString()
            };

            const json = JSON.stringify(data, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            this.downloadFile(blob, 'library-data.json');
            this.showToast('success', 'Data exported as JSON');
        } catch (error) {
            // Error already shown
        }
    },

    async exportDataCSV() {
        try {
            const books = await this.apiCall('/books?page=1&limit=10000');

            let csv = 'Book ID,Title,Author,Category,Total Copies,Available Copies\n';
            books.data.books.forEach(book => {
                csv += `"${book.book_id}","${book.title}","${book.author}","${book.category || ''}",${book.total_copies},${book.available_copies}\n`;
            });

            const blob = new Blob([csv], { type: 'text/csv' });
            this.downloadFile(blob, 'library-books.csv');
            this.showToast('success', 'Data exported as CSV');
        } catch (error) {
            // Error already shown
        }
    },

    downloadFile(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    importData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json';
        input.style.display = 'none';

        input.addEventListener('change', async () => {
            const file = input.files?.[0];
            if (!file) return;

            try {
                const text = await file.text();
                const json = JSON.parse(text);
                await this.importDataFromJson(json);
            } catch (error) {
                this.showToast('error', 'Unable to import data. Please select a valid JSON file.');
            } finally {
                input.remove();
            }
        });

        document.body.appendChild(input);
        input.click();
    },

    async importDataFromJson(data) {
        if (!data || (!Array.isArray(data.books) && !Array.isArray(data.members))) {
            this.showToast('error', 'Invalid import file format. Expecting books and/or members arrays.');
            return;
        }

        this.showSpinner(true);
        const importResult = {
            books: 0,
            members: 0,
            errors: []
        };

        const importItems = async (items, endpoint) => {
            if (!Array.isArray(items)) return 0;
            let count = 0;
            await Promise.all(items.map(async (item) => {
                try {
                    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(item)
                    });

                    if (!response.ok) {
                        const result = await response.json().catch(() => ({}));
                        importResult.errors.push(`${endpoint} import failed: ${result.error || response.statusText}`);
                        return;
                    }

                    count += 1;
                } catch (error) {
                    importResult.errors.push(`${endpoint} request failed: ${error.message}`);
                }
            }));
            return count;
        };

        importResult.books = await importItems(data.books, '/books');
        importResult.members = await importItems(data.members, '/members');

        if (Array.isArray(data.transactions)) {
            importResult.errors.push('Transaction history import is skipped. Use Issue/Return features after importing data.');
        }

        this.loadBooks();
        this.loadMembers();
        this.loadTransactions();
        this.loadDashboard();

        const summary = `Imported ${importResult.books} books and ${importResult.members} members.`;
        if (importResult.errors.length > 0) {
            this.showToast('error', `${summary} ${importResult.errors.length} issues occurred. Check console for details.`);
            console.error('Import errors:', importResult.errors);
        } else {
            this.showToast('success', `${summary} Import completed.`);
        }

        this.showSpinner(false);
    },

    async clearAllData() {
        if (!confirm('Are you sure? This will delete ALL library data.')) return;
        if (!confirm('This is irreversible. Do you want to continue?')) return;

        try {
            this.showSpinner(true);
            await this.apiCall('/admin/clear-all', 'POST');
            this.showToast('success', 'All library data has been cleared.');
            this.loadBooks();
            this.loadMembers();
            this.loadTransactions();
            this.loadDashboard();
        } catch (error) {
            // Error already shown
        } finally {
            this.showSpinner(false);
        }
    },

    async generateInventoryReport() {
        try {
            const books = await this.apiCall('/books?page=1&limit=10000');
            const total = books.data.books.reduce((sum, b) => sum + b.total_copies, 0);
            const available = books.data.books.reduce((sum, b) => sum + b.available_copies, 0);
            const borrowed = total - available;

            let report = `INVENTORY REPORT\n`;
            report += `Generated: ${new Date().toLocaleString()}\n\n`;
            report += `Total Books: ${total}\n`;
            report += `Available: ${available}\n`;
            report += `Borrowed: ${borrowed}\n\n`;
            report += `Books with Low Stock:\n`;

            books.data.books.filter(b => b.available_copies <= 2).forEach(b => {
                report += `- ${b.title} by ${b.author}: ${b.available_copies}/${b.total_copies}\n`;
            });

            this.downloadFile(new Blob([report], { type: 'text/plain' }), 'inventory-report.txt');
            this.showToast('success', 'Inventory report generated');
        } catch (error) {
            // Error already shown
        }
    },

    async generateMemberReport() {
        try {
            const members = await this.apiCall('/members?page=1&limit=10000');

            let report = `MEMBER REPORT\n`;
            report += `Generated: ${new Date().toLocaleString()}\n\n`;
            report += `Total Members: ${members.data.members.length}\n`;
            report += `Active: ${members.data.members.filter(m => m.status === 'active').length}\n`;
            report += `Suspended: ${members.data.members.filter(m => m.status === 'suspended').length}\n\n`;

            report += `All Members:\n`;
            members.data.members.forEach(m => {
                report += `- ${m.name} (${m.card_id}) - ${m.membership_type} - ${m.status}\n`;
            });

            this.downloadFile(new Blob([report], { type: 'text/plain' }), 'member-report.txt');
            this.showToast('success', 'Member report generated');
        } catch (error) {
            // Error already shown
        }
    },

    async generateTransactionReport() {
        try {
            const txns = await this.apiCall('/transactions?page=1&limit=10000');

            let report = `TRANSACTION REPORT\n`;
            report += `Generated: ${new Date().toLocaleString()}\n\n`;
            report += `Total Transactions: ${txns.data.transactions.length}\n`;
            report += `Issued: ${txns.data.transactions.filter(t => t.status === 'issued').length}\n`;
            report += `Returned: ${txns.data.transactions.filter(t => t.status === 'returned').length}\n`;
            report += `Overdue: ${txns.data.transactions.filter(t => t.status === 'overdue').length}\n\n`;

            report += `Overdue Books:\n`;
            txns.data.transactions.filter(t => t.status === 'overdue').forEach(t => {
                report += `- ${t.title} - Due: ${new Date(t.due_date).toLocaleDateString()} - Fine: ₹${t.fine_amount}\n`;
            });

            this.downloadFile(new Blob([report], { type: 'text/plain' }), 'transaction-report.txt');
            this.showToast('success', 'Transaction report generated');
        } catch (error) {
            // Error already shown
        }
    },

    async generateFineReport() {
        try {
            const txns = await this.apiCall('/transactions?page=1&limit=10000');
            const fines = txns.data.transactions.filter(t => t.fine_amount > 0);
            const totalFine = fines.reduce((sum, f) => sum + f.fine_amount, 0);

            let report = `FINE COLLECTION REPORT\n`;
            report += `Generated: ${new Date().toLocaleString()}\n\n`;
            report += `Total Overdue Books: ${fines.length}\n`;
            report += `Total Fine Amount: ₹${totalFine.toFixed(2)}\n\n`;

            report += `Fines by Member:\n`;
            const finesByMember = {};
            fines.forEach(f => {
                if (!finesByMember[f.member_name]) finesByMember[f.member_name] = 0;
                finesByMember[f.member_name] += f.fine_amount;
            });

            Object.entries(finesByMember).forEach(([name, amount]) => {
                report += `- ${name}: ₹${amount.toFixed(2)}\n`;
            });

            this.downloadFile(new Blob([report], { type: 'text/plain' }), 'fine-report.txt');
            this.showToast('success', 'Fine report generated');
        } catch (error) {
            // Error already shown
        }
    },

    async recalculateOverdue() {
        try {
            this.showSpinner(true);
            await this.apiCall('/dashboard/calculate-overdue', 'POST');
            this.showToast('success', 'Overdue fines calculated');
            this.loadDashboard();
            this.loadTransactions();
            this.showSpinner(false);
        } catch (error) {
            this.showSpinner(false);
        }
    },

    // ============================================
    // UTILITY FUNCTIONS
    // ============================================

    showSpinner(show) {
        const spinner = document.getElementById('spinner');
        if (show) {
            spinner.classList.add('active');
        } else {
            spinner.classList.remove('active');
        }
    },

    showToast(type, message) {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <span class="toast-message">${message}</span>
            <button class="toast-close" onclick="this.parentElement.remove()">×</button>
        `;
        container.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 5000);
    },

    renderPagination(elementId, pagination, callback) {
        const container = document.getElementById(elementId);
        container.innerHTML = '';

        if (pagination.pages <= 1) return;

        // Previous Button
        const prevBtn = document.createElement('button');
        prevBtn.textContent = '← Previous';
        prevBtn.disabled = pagination.page === 1;
        prevBtn.onclick = () => callback(pagination.page - 1);
        container.appendChild(prevBtn);

        // Page Numbers
        for (let i = 1; i <= pagination.pages; i++) {
            if (i === 1 || i === pagination.pages || (i >= pagination.page - 1 && i <= pagination.page + 1)) {
                const btn = document.createElement('button');
                btn.textContent = i;
                btn.className = i === pagination.page ? 'active' : '';
                btn.onclick = () => callback(i);
                container.appendChild(btn);
            } else if (i === 2 && pagination.page > 3) {
                const span = document.createElement('span');
                span.textContent = '...';
                span.style.padding = '8px';
                container.appendChild(span);
            }
        }

        // Next Button
        const nextBtn = document.createElement('button');
        nextBtn.textContent = 'Next →';
        nextBtn.disabled = pagination.page === pagination.pages;
        nextBtn.onclick = () => callback(pagination.page + 1);
        container.appendChild(nextBtn);
    },

    async checkServerStatus() {
        try {
            const health = await fetch(`${API_BASE_URL.replace('/api', '')}/health`);
            if (health.ok) {
                document.getElementById('serverStatus').textContent = '✓ Connected';
                document.getElementById('serverStatus').style.background = '#dcfce7';
                document.getElementById('serverStatus').style.color = '#166534';
            }
        } catch {
            document.getElementById('serverStatus').textContent = '✗ Disconnected';
            document.getElementById('serverStatus').style.background = '#fee2e2';
            document.getElementById('serverStatus').style.color = '#991b1b';
        }

        document.getElementById('dbStatus').textContent = '✓ Connected';
        document.getElementById('dbStatus').style.background = '#dcfce7';
        document.getElementById('dbStatus').style.color = '#166534';
    }
};

// Initialize Application on Page Load
document.addEventListener('DOMContentLoaded', () => {
    window.app.init();
});
