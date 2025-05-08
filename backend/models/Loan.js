const db = require('../config/db-config');
const User = require('../models/User');
const Book = require('../models/Book');

const Loan = {

    create: async (loanData) => {
        const connection = await db.promise().getConnection();
        try {
            await connection.beginTransaction();

            let bookInfo;
            try {
                bookInfo = await Book.getByIdForUpdate(loanData.book_id, connection);
            } catch (err) {
                if (err.message === 'Book not found') {
                    throw new Error('Book not found');
                }
                throw err;
            }

            if (bookInfo.availableCopies <= 0) {
                throw new Error('No available copies of this book');
            }

            const userExists = await User.exists(loanData.user_id, connection);
            if (!userExists) {
                await connection.rollback();
                throw new Error('User not found');
            }

            const [existingLoans] = await connection.query(
                'SELECT id FROM loans WHERE user_id = ? AND book_id = ? AND status = ?',
                [loanData.user_id, loanData.book_id, "ACTIVE"]
            );
            if (existingLoans.length > 0) {
                await connection.rollback();
                throw new Error('You already has an active loan for this book');
            }

            const [loanResults] = await connection.query(
                'INSERT INTO loans (user_id, book_id, due_date, status) VALUES (?, ?, ?, ?)',
                [loanData.user_id, loanData.book_id, loanData.due_date, "ACTIVE"]
            );

            await Book.updateAvailability(loanData.book_id, bookInfo.availableCopies - 1, connection);

            await connection.commit();

            const [loan] = await connection.query(
                'SELECT * FROM loans WHERE id = ?',
                [loanResults.insertId]
            );

            return loan[0];

        } catch (err) {
            if (connection) await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }
    },

    returnBook: async (loanId) => {
        const connection = await db.promise().getConnection();
        try {
            await connection.beginTransaction();

            const [loans] = await connection.query(
                `SELECT l.*, b.available_copies 
                 FROM loans l
                 JOIN books b ON l.book_id = b.id
                 WHERE l.id = ? AND l.status = "ACTIVE" FOR UPDATE`,
                [loanId]
            );

            const loan = loans[0];
            if (!loan) {
                await connection.rollback();
                throw new Error('Active loan not found');
            }

            await connection.query(
                'UPDATE loans SET return_date = NOW(), status = "RETURNED" WHERE id = ?',
                [loanId]
            );

            await Book.updateAvailability(loan.book_id, loan.available_copies + 1, connection);
            await connection.commit();

            const [updatedLoan] = await connection.query(
                'SELECT * FROM loans WHERE id = ?',
                [loanId]
            );

            return updatedLoan;

        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }
    },

    findByUserId: async (userId) => {
        const loanQuery = `
            SELECT 
                l.id,
                l.issue_date,
                l.due_date,
                l.return_date,
                l.status,
                l.extensions_count,
                b.id AS book_id,
                b.title AS book_title,
                b.author AS book_author,
                b.isbn AS book_isbn
            FROM loans l
            JOIN books b ON l.book_id = b.id
            WHERE l.user_id = ?
            ORDER BY l.issue_date DESC
        `;

        const [results] = await db.promise().query(loanQuery, [userId]);
        return results;
    },

    findOverdue: async () => {
        const currentDate = new Date().toISOString().split('T')[0];
        const overdueQuery = `
            SELECT 
                l.id,
                l.issue_date,
                l.due_date,
                DATEDIFF(?, l.due_date) AS days_overdue,
                u.id AS user_id,
                u.name AS user_name,
                u.email AS user_email,
                b.id AS book_id,
                b.title AS book_title,
                b.author AS book_author
            FROM loans l
            JOIN users u ON l.user_id = u.id
            JOIN books b ON l.book_id = b.id
            WHERE l.status = 'ACTIVE' 
            AND l.due_date < ?
            ORDER BY days_overdue DESC
        `;

        const [results] = await db.promise().query(overdueQuery, [currentDate, currentDate]);
        return results;
    },

    extend: async (loanId, extensionDays) => {
        const connection = await db.promise().getConnection();
        try {
            await connection.beginTransaction();

            const [loans] = await connection.query(
                `SELECT 
                    id, 
                    user_id, 
                    book_id, 
                    issue_date, 
                    due_date AS original_due_date,
                    extensions_count
                 FROM loans 
                 WHERE id = ? AND status = 'ACTIVE'
                 FOR UPDATE`,
                [loanId]
            );

            const loan = loans[0];

            if (!loan) {
                await connection.rollback();
                throw new Error('Active loan not found');
            }

            const newDueDate = new Date(loan.original_due_date);
            newDueDate.setDate(newDueDate.getDate() + parseInt(extensionDays));

            await connection.query(
                `UPDATE loans 
                 SET 
                    due_date = ?,
                    extensions_count = extensions_count + 1
                 WHERE id = ?`,
                [newDueDate, loanId]
            );

            await connection.commit();

            return {
                id: loan.id,
                user_id: loan.user_id,
                book_id: loan.book_id,
                issue_date: loan.issue_date,
                original_due_date: loan.original_due_date,
                extended_due_date: newDueDate.toISOString(),
                status: 'ACTIVE',
                extensions_count: loan.extensions_count + 1
            };

        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }
    },

    existsActiveLoanForBook: async (bookId) => {
        const [rows] = await db.promise().query(
            'SELECT id FROM loans WHERE book_id = ? AND status = "ACTIVE"',
            [bookId]
        );
        return rows.length > 0;
    },

    getCurrentStats: async () => {
        const [results] = await db.promise().query(`
            SELECT 
                COUNT(*) AS books_borrowed,
                SUM(CASE WHEN due_date < NOW() THEN 1 ELSE 0 END) AS overdue_loans,
                SUM(CASE WHEN DATE(issue_date) = CURDATE() THEN 1 ELSE 0 END) AS loans_today,
                SUM(CASE WHEN DATE(return_date) = CURDATE() THEN 1 ELSE 0 END) AS returns_today
            FROM loans 
            WHERE status = 'ACTIVE'
        `);
        return results[0];
    }
}

module.exports = Loan