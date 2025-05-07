const express = require('express')
const router = express.Router()
const {signup, login, logout, getUserById} = require('../controllers/userController')

router.post('/', signup)
router.post('/login', login)
router.post('/logout', logout)
router.get('/:id', getUserById)

module.exports = router