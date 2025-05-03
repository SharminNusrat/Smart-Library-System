const express = require('express')
const router = express.Router()

const {
    issueLoan,
    returnBook,
    getUserLoans,
    getOverdueLoans,
    extendLoan,
} = require('../controllers/loanController')

router.post('/', issueLoan)
router.post('/returns', returnBook)
router.get('/overdue', getOverdueLoans)
router.get('/:user_id', getUserLoans)
router.put('/:id/extend', extendLoan)

module.exports = router