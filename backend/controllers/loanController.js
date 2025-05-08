const Loan = require('../models/Loan');

const issueLoan = async (req, res) => {
    const { user_id, book_id, due_date } = req.body

    if (!user_id || !book_id || !due_date) {
        return res.status(400).json({
            status: 'error',
            message: 'user_id, book_id, and due_date are required'
        });
    }

    const minDueDate = new Date()
    minDueDate.setDate(minDueDate.getDate() + 3)

    if (new Date(due_date) <= minDueDate) {
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
        const updatedLoan = await Loan.returnBook(loan_id);
        return res.status(200).json({
            status: 'success',
            data: updatedLoan
        });

    } catch (err) {
        console.error(err);
        const statusCode = err.message.includes('not found') ? 404 : 500;
        return res.status(statusCode).json({
            status: 'error',
            message: err.message || 'Failed to return book'
        });
    }
};

const getUserLoans = async (req, res) => {
    const userId = req.params.user_id;

    if (!userId || isNaN(userId)) {
        return res.status(400).json({
            status: 'error',
            message: 'Valid user ID is required!'
        });
    }

    const results = await Loan.findByUserId(userId);

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
};

const getOverdueLoans = async (req, res) => {

    try {
        const results = await Loan.findOverdue();
        const overdueLoans = results.map(loan => ({
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

        return res.status(200).json(overdueLoans);

    } catch (error) {
        console.error('Database error:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Failed to fetch overdue loans'
        });
    }
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
        
        const extendedLoan = await Loan.extend(loanId, extension_days);
        return res.status(200).json({
            status: 'success',
            data: extendedLoan
        });

    } catch (err) {
        console.error(err);
        const statusCode = err.message.includes('not found') ? 404 : 500;
        return res.status(statusCode).json({
            status: 'error',
            message: err.message || 'Failed to extend loan'
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