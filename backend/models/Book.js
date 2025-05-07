const db = require('../config/db-config')

const Book = {
    isbnExists: async (isbn) => {
        const [rows] = await db.promise().query('SELECT id FROM books WHERE isbn = ?', [isbn]);
        return rows.length > 0;
    },

    create: async (bookData) => {
        const insertQuery = `
            INSERT INTO books 
            (title, author, isbn, copies, available_copies, status, genre, published_year)
            VALUE (?)
        `;

        const values = [
            bookData.title,
            bookData.author,
            bookData.isbn,
            bookData.copies,
            bookData.copies,
            'AVAILABLE',
            bookData.genre,
            bookData.published_year
        ];

        const result = await db.promise().query(insertQuery, [values]);
        return result;
    },

    search: async (keyword) => {
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
        const [rows] = await db.promise().query(searchQuery, [searchValue, searchValue, searchValue, searchValue]);
        return rows;
    },

    getById: async (bookId) => {
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

        const [rows] = await db.promise().query(bookQuery, [bookId]);
        return rows[0];
    },

    update: async (bookId, updateData) => {
        let updateFields = [];
        let updateValues = [];

        Object.entries(updateData).forEach(([field, value]) => {
            if (value !== undefined) {
                updateFields.push(`${field} = ?`);
                updateValues.push(value);
            }
        });

        updateFields.push('updated_at = CURRENT_TIMESTAMP');
        updateValues.push(bookId);

        const updateQuery = `
        UPDATE books
        SET ${updateFields.join(', ')}
        WHERE id = ?
        `;
        console.log(updateQuery);

        const [result] = await db.promise().query(updateQuery, updateValues);
        return result;
    },

    delete: async (bookId) => {
        const [result] = await db.promise().query('DELETE FROM books WHERE id = ?', [bookId]);
        return result;
    },

    getAvailableCopiesWithLock: async (bookId) => {
        const results = await query(
            'SELECT available_copies FROM books WHERE id = ? FOR UPDATE',
            [bookId]
        );
        if (results.length === 0) {
            throw new Error('Book not found');
        }
        return results[0].available_copies;
    },

    updateAvailability: async (bookId, newAvailable) => {
        let updateQuery = 'UPDATE books SET available_copies = ?';
        const params = [newAvailable];

        if (newAvailable === 0) {
            updateQuery += ', status = "UNAVAILABLE"';
        } else if (newAvailable > 0) {
            updateQuery += ', status = "AVAILABLE"';
        }

        updateQuery += ' WHERE id = ?';
        params.push(bookId);

        await query(updateQuery, params);
    }
}

module.exports = Book