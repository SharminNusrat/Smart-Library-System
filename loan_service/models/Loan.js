const db = require('../config/db-config');

const Loan = {

    create: async (loanData) => {
        const connection = await db.promise().getConnection();
        try {
            await connection.beginTransaction();

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
                `SELECT * FROM loans WHERE id = ? AND status = "ACTIVE"`,
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

            await connection.commit();

            const [updatedLoan] = await connection.query(
                'SELECT * FROM loans WHERE id = ?',
                [loanId]
            );

            return updatedLoan[0];

        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }
    },

    getById: async (loanId) => {
        const [results] = await db.promise().query(`SELECT * FROM loans WHERE id = ?`, [loanId]);
        return results[0];
    },

    findByUserId: async (userId) => {
        const loanQuery = `
            SELECT 
                id,
                book_id,
                issue_date,
                due_date,
                return_date,
                status,
                extensions_count
            FROM loans 
            WHERE user_id = ?
            ORDER BY issue_date DESC
        `;

        const [results] = await db.promise().query(loanQuery, [userId]);

        return results[0];
    },

    findOverdue: async () => {
        const currentDate = new Date().toISOString().split('T')[0];
        const overdueQuery = `
        SELECT 
            id,
            user_id,
            book_id,
            issue_date,
            due_date,
            DATEDIFF(?, due_date) AS days_overdue
        FROM loans
        WHERE status = 'ACTIVE' 
        AND due_date < ?
        ORDER BY days_overdue DESC
    `;

        const [loans] = await db.promise().query(overdueQuery, [currentDate, currentDate]);
        return loans;
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
                ...loan,
                extended_due_date: newDueDate.toISOString(),
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

    getPopularBookStats: async (limit = 5) => {
        const [results] = await db.promise().query(`
        SELECT book_id, COUNT(id) AS borrow_count
        FROM loans
        GROUP BY book_id
        ORDER BY borrow_count DESC
        LIMIT ?
    `, [limit]);
        return results;
    },

    getActiveUserStats: async (limit = 5) => {
        const [results] = await db.promise().query(`
        SELECT user_id, COUNT(id) AS books_borrowed
        FROM loans
        GROUP BY user_id
        ORDER BY books_borrowed DESC
        LIMIT ?
    `, [limit]);
        return results;
    },

    getCurrentStats: async () => {
        const [results] = await db.promise().query(`
        SELECT 
            COUNT(*) AS books_borrowed,
            SUM(CASE WHEN due_date < NOW() AND status = 'ACTIVE' THEN 1 ELSE 0 END) AS overdue_loans,
            SUM(CASE WHEN DATE(issue_date) = CURDATE() THEN 1 ELSE 0 END) AS loans_today,
            SUM(CASE WHEN status = 'RETURNED' AND DATE(return_date) = CURDATE() THEN 1 ELSE 0 END) AS returns_today
        FROM loans
        WHERE status IN ('ACTIVE', 'RETURNED')
    `);
        return results[0];
    }
}

module.exports = Loan