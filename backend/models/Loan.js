const db = require('../config/db-config');
const util = require('util');
const User = require('../models/User');
const Book = require('../models/Book');

const query = util.promisify(db.query).bind(db);
const beginTransaction = util.promisify(db.beginTransaction).bind(db);
const commit = util.promisify(db.commit).bind(db);
const rollback = util.promisify(db.rollback).bind(db);


const Loan = {

    create: async (loanData) => {
        let connection;
        try {
            await beginTransaction();

            const currentAvailable = await Book.getAvailableCopiesWithLock(loanData.book_id);
            if (currentAvailable <= 0) {
                await rollback();
                throw new Error('No available copies of this book');
            }

            const userExists = await User.exists(loanData.user_id);
            if (!userExists) {
                await rollback();
                throw new Error('User not found');
            }

            const existingLoans = await query(
                'SELECT id FROM loans WHERE user_id = ? AND book_id = ? AND status = ?',
                [loanData.user_id, loanData.book_id, "ACTIVE"]
            );
            if (existingLoans.length > 0) {
                await rollback();
                throw new Error('You already has an active loan for this book');
            }

            const loanResults = await query(
                'INSERT INTO loans (user_id, book_id, due_date, status) VALUES (?, ?, ?, ?)',
                [loanData.user_id, loanData.book_id, loanData.due_date, "ACTIVE"]
            );

            await Book.updateAvailability(loanData.book_id, currentAvailable - 1);
            
            await commit();

            const [loan] = await query(
                'SELECT * FROM loans WHERE id = ?', 
                [loanResults.insertId]
            );
            
            return loan;

        } catch (err) {
            if (connection) await rollback();
            throw err;
        }
    },

    existsActiveLoanForBook: async (bookId) =>  {
        const [rows] = await db.promise().query(
            'SELECT id FROM loans WHERE book_id = ? AND status = "ACTIVE"',
            [bookId]
        );
        return rows.length > 0;
    }
}

module.exports = Loan