const express = require('express')
const { 
    addNewBook, 
    searchBooks, 
    getBookById, 
    updateBook, 
    deleteBook,
    updateBookAvailability,
    getBookCounts
} = require('../controllers/bookController')
const router = express.Router()

// 1. Static routes first
router.get('/counts', getBookCounts)  

// 2. Parameterized routes after
router.get('/:id', getBookById)  
router.patch('/:id/availability', updateBookAvailability)
router.put('/:id', updateBook)
router.delete('/:id', deleteBook)

// 3. Root routes
router.post('/', addNewBook)
router.get('/', searchBooks)

module.exports = router