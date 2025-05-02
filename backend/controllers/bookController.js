const db = require('../config/db-config');

const addNewBook = (req, res) => {
    const { 
        title, 
        author, 
        isbn, 
        copies, 
        genre, 
        published_year,
    } = req.body;

    if (!title || !author || !isbn || !copies || !genre || !published_year) {
        return res.status(400).json({
            status: 'error',
            message: 'Title, author, ISBN, copies, genre  and published year are required'
        });
    }

    db.query('SELECT id FROM books WHERE isbn = ?', [isbn], (err, results) => {
        if (err) {
            console.log(err);
            return res.status(500).json({
                status: 'error',
                message: 'Database error'
            });
        }

        if (results.length > 0) {
            return res.status(409).json({
                status: 'error',
                message: 'Book with this ISBN already exists'
            });
        }

        const insertQuery = `
            INSERT INTO books 
            (title, author, isbn, copies, available_copies, status, genre, published_year)
            VALUE (?)
        `;
        
        const values = [
            title,
            author,
            isbn,
            copies,
            copies, 
            'AVAILABLE', 
            genre,
            published_year
        ];

        db.query(insertQuery, [values], (err, result) => {
            if (err) {
                console.log(err);
                return res.status(500).json({
                    status: 'error',
                    message: 'Failed to add book'
                });
            }

            return res.status(201).json({
                data: {
                    title,
                    author,
                    isbn,
                    copies
                }
            })
        });
    });
};

const searchBooks = (req, res) => {
    const keyword = req.query.search;

    if (!keyword || keyword.trim() === '') {
        return res.status(400).json({
            status: 'error',
            message: 'Search keyword is required'
        });
    }

    const searchQuery = `
        SELECT 
            id, 
            title, 
            author, 
            isbn, 
            copies, 
            available_copies,
            genre,
            published_year
        FROM books
        WHERE 
            title LIKE ? OR 
            author LIKE ? OR 
            genre LIKE ? OR
            isbn LIKE ?
    `;
    
    const searchValue = `%${keyword}%`;
    
    db.query(searchQuery, 
        [searchValue, searchValue, searchValue, searchValue], 
        (err, results) => {
            if (err) {
                console.error(err);
                return res.status(500).json({
                    status: 'error',
                    message: 'Database error'
                });
            }

            return res.status(200).json({
                status: 'success',
                count: results.length,
                data: results
            });
        }
    );
};

const getBookById = (req, res) => {
    const bookId = req.params.id;

    if (!bookId || isNaN(bookId)) {
        return res.status(400).json({
            status: 'error',
            message: 'Valid book ID is required'
        });
    }

    const bookQuery = `
        SELECT 
            id,
            title,
            author,
            isbn,
            copies,
            available_copies,
            status,
            genre,
            published_year,
            created_at,
            updated_at
        FROM books
        WHERE id = ?
    `;

    db.query(bookQuery, [bookId], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({
                status: 'error',
                message: 'Database error'
            });
        }

        if (results.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Book not found'
            });
        }

        return res.status(200).json({
            status: 'success',
            data: results[0]
        });
    });
};

const updateBook = (req, res) => {
    const bookId = req.params.id;
    const { 
        title, 
        author, 
        isbn, 
        copies, 
        available_copies, 
        status, 
        genre, 
        published_year 
    } = req.body;

    if (!bookId || isNaN(bookId)) {
        return res.status(400).json({
            status: 'error',
            message: 'Valid book ID is required'
        });
    }

    const updateableFields = ['title', 'author', 'isbn', 'copies', 'available_copies', 'status', 'genre', 'published_year'];
    const hasValidUpdate = updateableFields.some(field => req.body[field] !== undefined);

    if (!hasValidUpdate) {
        return res.status(400).json({
            status: 'error',
            message: 'At least one field must be provided for update',
        });
    }

    if (copies !== undefined && (isNaN(copies) || copies < 0)) {
        return res.status(400).json({
            status: 'error',
            message: 'Copies must be a positive number'
        });
    }

    if (available_copies !== undefined && (isNaN(available_copies) || available_copies < 0)) {
        return res.status(400).json({
            status: 'error',
            message: 'Available copies must be a positive number'
        });
    }

    let updateFields = [];
    let updateValues = [];

    updateableFields.forEach(field => {
        if (req.body[field] !== undefined) {
            updateFields.push(`${field} = ?`);
            updateValues.push(req.body[field]);
        }
    });

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateValues.push(bookId); 

    const updateQuery = `
        UPDATE books
        SET ${updateFields.join(', ')}
        WHERE id = ?
    `;
    console.log(updateQuery)

    db.query(updateQuery, updateValues, (err, result) => {
        if (err) {
            console.error('Update error:', err);
            return res.status(500).json({
                status: 'error',
                message: 'Database error during update',
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Book not found'
            });
        }

        db.query('SELECT * FROM books WHERE id = ?', [bookId], (err, results) => {
            if (err) {
                console.error('Fetch error:', err);
                return res.status(500).json({
                    status: 'error',
                    message: 'Failed to fetch updated book'
                });
            }

            return res.status(200).json({
                status: 'success',
                message: 'Book updated successfully',
                data: results[0]
            });
        });
    });
};

const deleteBook = (req, res) => {
    const bookId = req.params.id;

    if (!bookId || isNaN(bookId)) {
        return res.status(400).json({
            status: 'error',
            message: 'Valid book ID is required'
        });
    }

    db.query(
        'SELECT id FROM loans WHERE book_id = ? AND status = "ACTIVE"',
        [bookId],
        (err, loans) => {
            if (err) {
                console.error(err);
                return res.status(500).json({
                    status: 'error',
                    message: 'Database error checking loans'
                });
            }

            if (loans.length > 0) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Cannot delete book with active loans'
                });
            }

            db.query('DELETE FROM books WHERE id = ?', [bookId], (err, result) => {
                if (err) {
                    console.error(err);
                    return res.status(500).json({
                        status: 'error',
                        message: 'Failed to delete book'
                    });
                }

                if (result.affectedRows === 0) {
                    return res.status(404).json({
                        status: 'error',
                        message: 'Book not found'
                    });
                }

                return res.status(204).end(); 
            });
        }
    );
};

module.exports = { 
    addNewBook,
    searchBooks, 
    getBookById, 
    updateBook, 
    deleteBook,
};