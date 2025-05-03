const db = require('../config/db-config');
const util = require('util');

const query = util.promisify(db.query).bind(db);

const getPopularBooks = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 5; 

        const results = await query(`
            SELECT 
                b.id AS book_id,
                b.title,
                b.author,
                COUNT(l.id) AS borrow_count
            FROM books b
            LEFT JOIN loans l ON b.id = l.book_id
            GROUP BY b.id
            ORDER BY borrow_count DESC
            LIMIT ?
        `, [limit]);

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

        const results = await query(`
            SELECT 
                u.id AS user_id,
                u.name,
                COUNT(l.id) AS books_borrowed
            FROM users u
            LEFT JOIN loans l ON u.id = l.user_id
            GROUP BY u.id
            ORDER BY books_borrowed DESC
            LIMIT ?
        `, [limit]);

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
        const queries = {
            total_books: 'SELECT COUNT(*) AS count FROM books',
            total_users: 'SELECT COUNT(*) AS count FROM users',
            books_available: 'SELECT SUM(available_copies) AS count FROM books',
            books_borrowed: `SELECT COUNT(*) AS count FROM loans WHERE status = 'ACTIVE'`,
            overdue_loans: `SELECT COUNT(*) AS count FROM loans WHERE status = 'ACTIVE' AND due_date < NOW()`,
            loans_today: `SELECT COUNT(*) AS count FROM loans WHERE DATE(issue_date) = CURDATE()`,
            returns_today: `SELECT COUNT(*) AS count FROM loans WHERE DATE(return_date) = CURDATE()`
        };

        const promises = Object.entries(queries).map(async ([key, sql]) => {
            try {
                const results = await query(sql);
                return { [key]: results[0].count };
            } catch (err) {
                console.error(`Error fetching ${key}:`, err);
                return { [key]: 0 }; 
            }
        });

        const results = await Promise.all(promises);
        const stats = results.reduce((accumulator, currentValue) => ({ ...accumulator, ...currentValue }), {});

        res.status(200).json(stats);
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