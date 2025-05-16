const express = require('express')
const { 
    addNewBook, 
    searchBooks, 
    getBookById, 
    updateBook, 
    deleteBook,
    updateBookAvailability
} = require('../controllers/bookController')
const router = express.Router()

router.post('/', addNewBook)
router.get('/', searchBooks)
router.get('/:id', getBookById)
router.put('/:id', updateBook)
router.patch('/:id/availability', updateBookAvailability)
router.delete('/:id', deleteBook)

module.exports = router