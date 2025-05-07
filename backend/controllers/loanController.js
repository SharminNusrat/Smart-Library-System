const Loan = require('../models/Loan');

const issueLoan = async (req, res) => {
    const {user_id, book_id, due_date} = req.body

    if(!user_id || !book_id || !due_date) {
        return res.status(400).json({
            status: 'error',
            message: 'user_id, book_id, and due_date are required'
        });
    }

    const minDueDate = new Date()
    minDueDate.setDate(minDueDate.getDate() + 3)

    if(new Date(due_date) <= minDueDate) {
        return res.status(400).json({
            status: 'error',
            message: 'Due date must be at least 3 days from now'
        });
    }

    try {
        const loanData = {
            user_id,
            book_id,
            due_date
        };

        const newLoan = await Loan.create(loanData);
        return res.status(201).json({
            status: 'success',
            data: newLoan
        });
    } catch (err) {
        console.error(err);
        const statusCode = err.message.includes('not found') ? 404 : 
                         err.message.includes('already has') ? 400 : 500;
        return res.status(statusCode).json({
            status: 'error',
            message: err.message || 'Failed to issue loan'
        });
    }
}

const returnBook = async (req, res) => {
    const { loan_id } = req.body;

    if (!loan_id) {
        return res.status(400).json({
            status: 'error',
            message: 'loan_id is required'
        });
    }

    try {
        await beginTransaction();

        const [loan] = await query(
            `SELECT l.*, b.available_copies 
             FROM loans l
             JOIN books b ON l.book_id = b.id
             WHERE l.id = ? AND l.status = "ACTIVE" FOR UPDATE`,
            [loan_id]
        );

        if (!loan) {
            await rollback();
            return res.status(404).json({
                status: 'error',
                message: 'Active loan not found'
            });
        }

        await query(
            'UPDATE loans SET return_date = NOW(), status = "RETURNED" WHERE id = ?',
            [loan_id]
        );

        const newAvailable = loan.available_copies + 1;
        let updateBookQuery = 'UPDATE books SET available_copies = ?';
        const updateParams = [newAvailable];

        if (newAvailable > 0) {
            updateBookQuery += ', status = "AVAILABLE"';
        }

        updateBookQuery += ' WHERE id = ?';
        updateParams.push(loan.book_id);

        await query(updateBookQuery, updateParams);
        await commit();

        const [updatedLoan] = await query(
            'SELECT * FROM loans WHERE id = ?',
            [loan_id]
        );

        return res.status(200).json({
            status: 'success',
            data: updatedLoan
        });

    } catch (err) {
        await rollback();
        console.error(err);
        
        return res.status(500).json({
            status: 'error',
            message: err.message || 'Database operation failed'
        });
    }
};

const getUserLoans = (req, res) => {
    const userId = req.params.user_id;

    if (!userId || isNaN(userId)) {
        return res.status(400).json({
            status: 'error',
            message: 'Valid user ID is required!'
        });
    }

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

    db.query(loanQuery, [userId], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({
                status: 'error',
                message: 'Failed to fetch loan history'
            });
        }

        const formattedLoans = results.map(loan => ({
            id: loan.id,
            book: {
                id: loan.book_id,
                title: loan.book_title,
                author: loan.book_author,
                isbn: loan.book_isbn
            },
            issue_date: loan.issue_date,
            due_date: loan.due_date,
            return_date: loan.return_date,
            status: loan.status,
            extensions_count: loan.extensions_count
        }));

        return res.status(200).json(formattedLoans);
    });
};

const getOverdueLoans = (req, res) => {
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

    db.query(overdueQuery, [currentDate, currentDate], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({
                status: 'error',
                message: 'Failed to fetch overdue loans'
            });
        }

        const formattedLoans = results.map(loan => ({
            id: loan.id,
            user: {
                id: loan.user_id,
                name: loan.user_name,
                email: loan.user_email
            },
            book: {
                id: loan.book_id,
                title: loan.book_title,
                author: loan.book_author
            },
            issue_date: loan.issue_date,
            due_date: loan.due_date,
            days_overdue: loan.days_overdue
        }));

        return res.status(200).json(formattedLoans);
    });
};

const extendLoan = async (req, res) => {
    const loanId = req.params.id;
    const { extension_days } = req.body;

    if (!loanId || isNaN(loanId)) {
        return res.status(400).json({
            status: 'error',
            message: 'Valid loan ID is required'
        });
    }

    if (!extension_days || isNaN(extension_days) || extension_days <= 0) {
        return res.status(400).json({
            status: 'error',
            message: 'extension_days must be a positive number'
        });
    }

    try {
        await beginTransaction();

        const loanResults = await query(
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

        if (loanResults.length === 0) {
            await rollback();
            return res.status(404).json({
                status: 'error',
                message: 'Active loan not found'
            });
        }

        const loan = loanResults[0];
        const newDueDate = new Date(loan.original_due_date);
        newDueDate.setDate(newDueDate.getDate() + parseInt(extension_days));

        await query(
            `UPDATE loans 
             SET 
                due_date = ?,
                extensions_count = extensions_count + 1
             WHERE id = ?`,
            [newDueDate, loanId]
        );

        await commit();

        return res.status(200).json({
            status: 'success',
            data: {
                id: loan.id,
                user_id: loan.user_id,
                book_id: loan.book_id,
                issue_date: loan.issue_date,
                original_due_date: loan.original_due_date,
                extended_due_date: newDueDate.toISOString(),
                status: 'ACTIVE',
                extensions_count: loan.extensions_count + 1
            }
        });

    } catch (err) {
        await rollback();
        console.error(err);
        const statusCode = err.message.includes('not found') ? 404 : 500;
        return res.status(statusCode).json({
            status: 'error',
            message: err.message || 'Database operation failed'
        });
    }
};

module.exports = {
    issueLoan,
    returnBook,
    getUserLoans,
    getOverdueLoans,
    extendLoan,
}