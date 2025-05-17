const express = require('express')
const router = express.Router()

const {
    issueLoan,
    returnBook,
    getUserLoans,
    getOverdueLoans,
    extendLoan,
    checkActiveLoanForBook,
    getLoanById
} = require('../controllers/loanController')

const {
    getPopularBooks,
    getActiveUsers,
    getSystemOverview
} = require('../controllers/statsController');

// SPECIFIC routes first
router.get('/overdue', getOverdueLoans);
router.get('/overview', getSystemOverview);  
router.get('/books/popular', getPopularBooks);
router.get('/users/active', getActiveUsers);

// PARAMETERIZED routes
router.get('/:id', getLoanById);  
router.get('/user/:user_id', getUserLoans);
router.get('/book/:id/check', checkActiveLoanForBook);

// Keep other routes 
router.post('/', issueLoan);
router.post('/returns', returnBook);
router.patch('/:id/extend', extendLoan);

module.exports = router