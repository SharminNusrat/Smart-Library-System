const Book = require('../models/Book');
const User = require('../models/User');
const Loan = require('../models/Loan');

const getPopularBooks = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 5;
        const results = await Book.getPopularBooks(limit);
        res.status(200).json(results);
    } catch (err) {
        console.error(err);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch popular books'
        });
    }
};

const getActiveUsers = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 5;
        const results = await User.getActiveUsers(limit);
        res.status(200).json(results);
    } catch (err) {
        console.error(err);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch active users'
        });
    }
};

const getSystemOverview = async (req, res) => {
    try {
        const [bookCounts, userCount, loanStats] = await Promise.all([
            Book.getCounts(),
            User.getTotalCount(),
            Loan.getCurrentStats()
        ]);

        res.status(200).json({
            total_books: bookCounts.total_books,
            total_users: userCount,
            books_available: bookCounts.books_available,
            books_borrowed: loanStats.books_borrowed,
            overdue_loans: loanStats.overdue_loans,
            loans_today: loanStats.loans_today,
            returns_today: loanStats.returns_today
        });
    } catch (error) {
        console.error('Error compiling statistics:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to compile system statistics'
        });
    }
};

module.exports = {
    getPopularBooks,
    getActiveUsers,
    getSystemOverview
};