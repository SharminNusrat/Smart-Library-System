const express = require('express')
const { 
    addNewBook, 
    searchBooks, 
    getBookById, 
    updateBook, 
    deleteBook 
} = require('../controllers/bookController')
const router = express.Router()

router.post('/', addNewBook)
router.get('/', searchBooks)
router.get('/:id', getBookById)
router.put('/:id', updateBook)
router.delete('/:id', deleteBook)

module.exports = router