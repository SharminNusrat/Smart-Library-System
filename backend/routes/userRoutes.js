const express = require('express')
const router = express.Router()
const {signup, login, logout, fetchProfile, getUserById} = require('../controllers/userController')
const {authMiddleware} = require('../middlewares/authMiddleware')

router.post('/', signup)
router.post('/login', login)
router.post('/logout', logout)
router.get('/:id', getUserById)

router.get('/profile', authMiddleware, fetchProfile)

module.exports = router