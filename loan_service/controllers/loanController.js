const Loan = require('../models/Loan')
const { getUserById, getBookById, updateBookAvailability } = require('../services/externalServices')

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

        let userInfo;
        try {
            userInfo = await getUserById(user_id);
        } catch (err) {
            if (err.code === 'ECONNABORTED' || err.message.includes('Breaker')) {
                return res.status(503).json({ status: 'error', message: 'User Service unavailable' });
            }
            return res.status(404).json({ status: 'error', message: 'User not found' });
        }

        let bookInfo;
        try {
            bookInfo = await getBookById(book_id);
        } catch (err) {
            if (err.code === 'ECONNABORTED' || err.message.includes('Breaker')) {
                return res.status(503).json({ status: 'error', message: 'Book Service unavailable' });
            }
            return res.status(404).json({ status: 'error', message: 'Book not found' });
        }

        if (bookInfo.available_copies <= 0) {
            return res.status(400).json({
                status: 'error',
                message: 'No available copies of this book'
            });
        }

        const newLoan = await Loan.create(loanData);
        if (newLoan && newLoan.id) {
            try {
                await updateBookAvailability(book_id, 'decrement');
            } catch (error) {
                console.warn('Book service update failed:', error.message)
            }
        }

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
        const returnedLoan = await Loan.returnBook(loan_id);

        if (returnedLoan) {
            try {
                await updateBookAvailability(returnedLoan.book_id, 'increment');
            } catch (err) {
                console.warn('Book availability update failed:', err.message);
            }
        }

        return res.status(200).json({
            status: 'success',
            data: returnedLoan
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

const getLoanById = async (req, res) => {
    console.log("hello!")
    const loanId = req.params.id

    if (!loanId || isNaN(loanId)) {
        return res.status(400).json({
            status: 'error',
            message: 'Valid user ID is required!'
        });
    }

    try {
        const loan = await Loan.getById(loanId);

        if (!loan) {
            return res.status(404).json({
                status: 'error',
                message: 'Loan not found'
            });
        }

        const [userResponse, bookResponse] = await Promise.allSettled([
            getUserById(loan.user_id),
            getBookById(loan.book_id)
        ]);

        console.log('Book service call status:', bookResponse.status);
        if (bookResponse.status === 'fulfilled') {
            console.log('Book data:', bookResponse.value);
        } else {
            console.error('Book service call failed:', bookResponse.reason);
        }

        const user = userResponse.status === 'fulfilled'
            ? {
                id: userResponse.value.id,
                name: userResponse.value.name,
                email: userResponse.value.email
            }
            : { id: loan.user_id };

        const book = bookResponse.status === 'fulfilled'
            ? {
                id: bookResponse.value.data.id,
                title: bookResponse.value.data.title,
                author: bookResponse.value.data.author
            }
            : { id: loan.book_id };

        const response = {
            id: loan.id,
            user,
            book,
            issue_date: loan.issue_date,
            due_date: loan.due_date,
            return_date: loan.return_date,
            status: loan.status
        };

        return res.status(200).json(response);

    } catch (error) {
        console.error('Error fetching loan:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Failed to fetch loan details'
        });
    }
}

const getUserLoans = async (req, res) => {
    const userId = req.params.user_id;

    if (!userId || isNaN(userId)) {
        return res.status(400).json({
            status: 'error',
            message: 'Valid user ID is required!'
        });
    }

    try {
        const results = await Loan.findByUserId(userId);

        const loans = await Promise.all(
            results.map(async (loan) => {
                let bookInfo = null;
                try {
                    const response = await getBookById(loan.book_id);
                    bookInfo = response.data;
                } catch (err) {
                    console.error(`Failed to fetch book ${loan.book_id}:`, err.message);
                }

                return {
                    id: loan.id,
                    book: bookInfo ? {
                        id: loan.book_id,
                        title: bookInfo.title,
                        author: bookInfo.author,
                        isbn: bookInfo.isbn
                    } : { id: loan.book_id },
                    issue_date: loan.issue_date,
                    due_date: loan.due_date,
                    return_date: loan.return_date,
                    status: loan.status,
                    extensions_count: loan.extensions_count
                };
            })
        );

        return res.status(200).json({
            status: 'success',
            data: loans
        });

    } catch (error) {
        console.error('Error fetching user loans:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Failed to fetch user loans'
        });
    }
};

const getOverdueLoans = async (req, res) => {
    try {
        const results = await Loan.findOverdue();

        const overdueLoans = await Promise.all(
            results.map(async (loan) => {
                let user = { id: loan.user_id };
                let book = { id: loan.book_id };

                try {
                    const userResponse = await getUserById(loan.user_id);
                    user = {
                        id: userResponse.id,
                        name: userResponse.name,
                        email: userResponse.email
                    };
                } catch (err) {
                    console.error(`Failed to fetch user ${loan.user_id}:`, err.message);
                }

                try {
                    const bookResponse = await getBookById(loan.book_id);
                    book = {
                        id: bookResponse.id,
                        title: bookResponse.title,
                        author: bookResponse.author
                    };
                } catch (err) {
                    console.error(`Failed to fetch book ${loan.book_id}:`, err.message);
                }

                return {
                    id: loan.id,
                    user,
                    book,
                    issue_date: loan.issue_date,
                    due_date: loan.due_date,
                    days_overdue: loan.days_overdue
                };
            })
        );

        return res.status(200).json({
            status: 'success',
            data: overdueLoans
        });

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
        const loan = await Loan.extend(loanId, extension_days);

        const formattedLoan = {
            id: loan.id,
            user_id: loan.user_id,
            book_id: loan.book_id,
            issue_date: loan.issue_date,
            original_due_date: loan.original_due_date,
            extended_due_date: loan.extended_due_date,
            status: 'ACTIVE',
            extensions_count: loan.extensions_count
        };

        return res.status(200).json({
            status: 'success',
            data: formattedLoan
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

const checkActiveLoanForBook = async (req, res) => {
    const bookId = req.params.id

    if (!bookId || isNaN(bookId)) {
        return res.status(400).json({
            status: 'error',
            message: 'Valid book ID is required'
        });
    }

    try {
        const exists = await Loan.existsActiveLoanForBook(bookId);
        return res.status(200).json({
            status: 'success',
            data: { exists }
        });
    } catch (err) {
        console.error('Loan check failed:', err);
        return res.status(500).json({
            status: 'error',
            message: 'Internal server error'
        });
    }
}

module.exports = {
    issueLoan,
    returnBook,
    getUserLoans,
    getOverdueLoans,
    extendLoan,
    checkActiveLoanForBook,
    getLoanById
}