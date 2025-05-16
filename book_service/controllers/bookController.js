const db = require('../config/db-config')
const Book = require('../models/Book');
const { hasActiveLoan } = require('../services/externalServices')

const handleError = (res, error, message = 'Database error') => {
    console.error(error);
    return res.status(500).json({
        status: 'error',
        message
    });
};

const addNewBook = async (req, res) => {
    try {
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
                message: 'All fields are required'
            });
        }

        const exists = await Book.isbnExists(isbn);
        if (exists) {
            return res.status(409).json({
                status: 'error',
                message: 'Book with this ISBN already exists'
            });
        }

        const result = await Book.create(req.body);
        return res.status(201).json({
            data: {
                title,
                author,
                isbn,
                copies
            }
        });

    } catch (error) {
        handleError(res, error, 'Failed to add book');
    }
};

const searchBooks = async (req, res) => {
    try {
        const keyword = req.query.search?.trim();

        if (!keyword) {
            return res.status(400).json({
                status: 'error',
                message: 'Search keyword is required'
            });
        }

        const results = await Book.search(keyword);
        return res.status(200).json({
            status: 'success',
            count: results.length,
            data: results
        });

    } catch (error) {
        handleError(res, error);
    }
};

const getBookById = async (req, res) => {
    try {
        const bookId = req.params.id;

        if (!bookId || isNaN(bookId)) {
            return res.status(400).json({
                status: 'error',
                message: 'Valid book ID is required'
            });
        }

        const book = await Book.getById(bookId);
        if (!book) {
            return res.status(404).json({
                status: 'error',
                message: 'Book not found'
            });
        }

        return res.status(200).json({
            status: 'success',
            data: book
        });
    } catch (error) {
        handleError(res, error);
    }
};

const updateBook = async (req, res) => {
    try {
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

        const result = await Book.update(bookId, req.body);
        if (result.affectedRows === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Book not found'
            });
        }

        const updatedBook = await Book.getById(bookId);
        return res.status(200).json({
            status: 'success',
            message: 'Book updated successfully',
            data: updatedBook
        });
    } catch (error) {
        handleError(res, error, 'Update failed');
    }
};

const updateBookAvailability = async (req, res) => {
    const bookId = req.params.id
    const { operation } = req.body

    if (!['increment', 'decrement'].includes(operation)) {
        return res.status(400).json({ error: 'Invalid operation' })
    }

    try {
        const book = await Book.getById(bookId)
        if (!book) {
            return res.status(404).json({ error: 'Book not found' })
        }

        let newAvailable = book.available_copies
        if (operation === 'decrement') {
            if (newAvailable <= 0) {
                return res.status(400).json({ error: 'No copies available' });
            }
            newAvailable--;
        }
        else {
            newAvailable++;
        }

        await Book.updateAvailability(bookId, newAvailable)

        return res.status(200).json({ message: 'Availability updated', available_copies: newAvailable });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

const deleteBook = async (req, res) => {
    try {
        const bookId = req.params.id;
        if (!bookId || isNaN(bookId)) {
            return res.status(400).json({
                status: 'error',
                message: 'Valid book ID is required'
            });
        }

        try {
            const hasLoans = await hasActiveLoan(bookId);
            if (hasLoans.data.exists) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Cannot delete book with active loans'
                });
            }
        } catch (err) {
            console.error('Loan check failed:', err.message);
            return res.status(503).json({
                status: 'error',
                message: 'Loan Service unavailable'
            });
        }

        const result = await Book.delete(bookId);
        if (result.affectedRows === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Book not found'
            });
        }

        return res.status(204).end();

    } catch (error) {
        handleError(res, error, 'Deletion failed');
    }
};

module.exports = {
    addNewBook,
    searchBooks,
    getBookById,
    updateBook,
    deleteBook,
    updateBookAvailability
};