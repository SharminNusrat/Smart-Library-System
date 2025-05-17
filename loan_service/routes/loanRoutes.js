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

router.post('/', issueLoan)
router.post('/returns', returnBook)
router.get('/:id', getLoanById)
router.get('/overdue', getOverdueLoans)
router.get('/user/:user_id', getUserLoans)
router.patch('/:id/extend', extendLoan)
router.get('/book/:id/check', checkActiveLoanForBook)

module.exports = router