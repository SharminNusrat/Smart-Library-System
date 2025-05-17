const express = require('express')
const router = express.Router()
const {signup, login, logout, getUserById, updateUser, getUserCounts} = require('../controllers/userController')

router.get('/counts', getUserCounts)

router.get('/:id', getUserById)
router.put('/:id', updateUser);

router.post('/', signup)
router.post('/login', login)
router.post('/logout', logout)

module.exports = router