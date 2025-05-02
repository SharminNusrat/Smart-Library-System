const db = require('../config/db-config')

const issueLoan = (req, res) => {
    const { user_id, book_id, due_date } = req.body;

    if (!user_id || !book_id || !due_date) {
        return res.status(400).json({
            status: 'error',
            message: 'user_id, book_id, and due_date are required'
        });
    }

    const minDueDate = new Date();
    minDueDate.setDate(minDueDate.getDate() + 3);

    if (new Date(due_date) <= minDueDate) {
        return res.status(400).json({
            status: 'error',
            message: 'Due date must be at least 3 days from now'
        });
    }

    db.beginTransaction(err => {
        if (err) {
            console.error('Transaction error:', err);
            return res.status(500).json({
                status: 'error',
                message: 'Failed to start transaction'
            });
        }

        db.query(
            'SELECT available_copies FROM books WHERE id = ? FOR UPDATE',
            [book_id],
            (err, bookResults) => {
                if (err) {
                    return db.rollback(() => {
                        console.error(err);
                        res.status(500).json({
                            status: 'error',
                            message: 'Database error checking book availability'
                        });
                    });
                }

                if (bookResults.length === 0) {
                    return db.rollback(() => {
                        res.status(404).json({
                            status: 'error',
                            message: 'Book not found'
                        });
                    });
                }

                const currentAvailable = bookResults[0].available_copies
                if (currentAvailable <= 0) {
                    return db.rollback(() => {
                        res.status(400).json({
                            status: 'error',
                            message: 'No available copies of this book'
                        });
                    });
                }

                db.query(
                    'SELECT id FROM users WHERE id = ?',
                    [user_id],
                    (err, userResults) => {
                        if (err) {
                            return db.rollback(() => {
                                console.error(err);
                                res.status(500).json({
                                    status: 'error',
                                    message: 'Database error checking user'
                                });
                            });
                        }

                        if (userResults.length === 0) {
                            return db.rollback(() => {
                                res.status(404).json({
                                    status: 'error',
                                    message: 'User not found'
                                });
                            });
                        }

                        db.query(
                            'SELECT id FROM loans WHERE user_id = ? AND book_id = ? AND status = "ACTIVE"',
                            [user_id, book_id],
                            (err, existingLoans) => {
                                if (err) {
                                    return db.rollback(() => {
                                        console.error(err);
                                        res.status(500).json({
                                            status: 'error',
                                            message: 'Database error checking existing loans'
                                        });
                                    });
                                }

                                if (existingLoans.length > 0) {
                                    return db.rollback(() => {
                                        res.status(400).json({
                                            status: 'error',
                                            message: 'You already have an active loan for this book'
                                        });
                                    });
                                }

                                db.query(
                                    'INSERT INTO loans (user_id, book_id, due_date, status) VALUES (?, ?, ?, "ACTIVE")',
                                    [user_id, book_id, due_date],
                                    (err, loanResults) => {
                                        if (err) {
                                            return db.rollback(() => {
                                                console.error(err);
                                                res.status(500).json({
                                                    status: 'error',
                                                    message: 'Failed to create loan record'
                                                });
                                            });
                                        }
                                
                                        const newAvailable = currentAvailable - 1;
                                        let updateBookQuery = 'UPDATE books SET available_copies = ?';
                                        const updateParams = [newAvailable];
                                
                                        if (newAvailable === 0) {
                                            updateBookQuery += ', status = "UNAVAILABLE"';
                                        }
                                
                                        updateBookQuery += ' WHERE id = ?';
                                        updateParams.push(book_id);
                                
                                        db.query(
                                            updateBookQuery,
                                            updateParams,
                                            (err, result) => {
                                                if (err) {
                                                    return db.rollback(() => {
                                                        console.error(err);
                                                        res.status(500).json({
                                                            status: 'error',
                                                            message: 'Failed to update book availability'
                                                        });
                                                    });
                                                }
                                
                                                db.commit(err => {
                                                    if (err) {
                                                        return db.rollback(() => {
                                                            console.error(err);
                                                            res.status(500).json({
                                                                status: 'error',
                                                                message: 'Failed to commit transaction'
                                                            });
                                                        });
                                                    }
                                
                                                    db.query(
                                                        'SELECT * FROM loans WHERE id = ?',
                                                        [loanResults.insertId],
                                                        (err, loanData) => {
                                                            if (err) {
                                                                console.error(err);
                                                                return res.status(500).json({
                                                                    status: 'error',
                                                                    message: 'Failed to fetch loan details'
                                                                });
                                                            }
                                
                                                            return res.status(201).json({
                                                                status: 'success',
                                                                data: loanData[0]
                                                            });
                                                        }
                                                    );
                                                });
                                            }
                                        );
                                    }
                                );
                            }
                        );
                    }
                );
            }
        );
    });
};

module.exports = {
    issueLoan,
}