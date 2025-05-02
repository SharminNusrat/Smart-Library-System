const express = require('express')
const router = express.Router()

const {
    issueLoan,
} = require('../controllers/loanController')

router.post('/', issueLoan)

module.exports = router