const express = require('express')
const app = express()
require('dotenv').config()
const bookRoutes = require('./routes/bookRoutes')

const port = process.env.PORT || 5052

app.use(express.json())
app.use(express.urlencoded({extended: true}))
app.use('/api/books', bookRoutes)

app.get('/', (req, res) => {
    res.send('Welcome to the Smart Library System - Book Service!')
})

app.listen(port, (req, res) => {
    console.log(`Book service is running at http://localhost:${port}`)
})