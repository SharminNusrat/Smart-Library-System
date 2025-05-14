const express = require('express')
const app = express()
require('dotenv').config()
const userRoutes = require('./routes/userRoutes')

const port = process.env.PORT || 5051

app.use(express.json())
app.use(express.urlencoded({extended: true}))
app.use('/api/users', userRoutes)

app.get('/', (req, res) => {
    res.send('Welcome to the Smart Library System - User Service!')
})

app.listen(port, (req, res) => {
    console.log(`User service is running at http://localhost:${port}`)
})