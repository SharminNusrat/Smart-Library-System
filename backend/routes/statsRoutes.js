const express = require('express')
const router = express.Router()

const {
    getPopularBooks,
    getActiveUsers,
    getSystemOverview,
} = require('../controllers/statsController')

router.get('/books/popular', getPopularBooks)
router.get('/users/active', getActiveUsers)
router.get('/overview', getSystemOverview)

module.exports = router