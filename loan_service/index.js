const express = require('express')
const app = express()
require('dotenv').config()
const loanRoutes = require('./routes/loanRoutes')

const port = process.env.PORT || 5053

app.use(express.json())
app.use(express.urlencoded({extended: true}))
app.use('/api/loans', loanRoutes)

app.get('/', (req, res) => {
    res.send('Welcome to the Smart Library System - Loan Service!')
})

app.listen(port, (req, res) => {
    console.log(`Loan service is running at http://localhost:${port}`)
})